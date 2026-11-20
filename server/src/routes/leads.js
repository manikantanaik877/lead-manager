const express = require('express');
const { STATUSES, SOURCES } = require('../constants');
const { validateLead } = require('../validation');
const { validationError, notFound, badRequest } = require('../errors');

// Whitelist: sort column names are interpolated into SQL, so they must never come straight from the client.
const SORTABLE = { name: 'name', company: 'company', status: 'status', source: 'source', created_at: 'created_at', updated_at: 'updated_at' };

const escapeLike = (s) => s.replace(/[\\%_]/g, '\\$&');

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw badRequest('Lead id must be a positive integer');
  return id;
}

function leadsRouter(db) {
  const router = express.Router();

  // Static metadata so the frontend doesn't hard-code the dropdown values.
  router.get('/meta', (_req, res) => res.json({ statuses: STATUSES, sources: SOURCES }));

  // Count of leads per status for the current user (dashboard).
  router.get('/stats', (req, res, next) => {
    try {
      const rows = db.prepare('SELECT status, COUNT(*) AS count FROM leads WHERE user_id = ? GROUP BY status').all(req.user.id);
      const byStatus = Object.fromEntries(STATUSES.map((s) => [s, 0]));
      let total = 0;
      for (const { status, count } of rows) {
        byStatus[status] = count;
        total += count;
      }
      res.json({ total, byStatus });
    } catch (err) {
      next(err);
    }
  });

  // List with search, status filter, sorting and pagination.
  router.get('/', (req, res, next) => {
    try {
      const { q = '', status = '', sort = 'created_at', order = 'desc' } = req.query;
      const page = Math.max(1, parseInt(req.query.page, 10) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 10));

      if (status && !STATUSES.includes(status)) throw badRequest(`status must be one of: ${STATUSES.join(', ')}`);
      if (!SORTABLE[sort]) throw badRequest(`sort must be one of: ${Object.keys(SORTABLE).join(', ')}`);
      if (!['asc', 'desc'].includes(String(order).toLowerCase())) throw badRequest('order must be asc or desc');

      const where = ['user_id = @userId'];
      const params = { userId: req.user.id };

      const term = String(q).trim();
      if (term) {
        // Name is the required search field; email/company are a convenience.
        where.push(`(name LIKE @term ESCAPE '\\' OR email LIKE @term ESCAPE '\\' OR company LIKE @term ESCAPE '\\')`);
        params.term = `%${escapeLike(term)}%`;
      }
      if (status) {
        where.push('status = @status');
        params.status = status;
      }

      const whereSql = where.join(' AND ');
      const { total } = db.prepare(`SELECT COUNT(*) AS total FROM leads WHERE ${whereSql}`).get(params);
      const direction = String(order).toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      // id as a tiebreaker keeps pagination stable when sort values repeat.
      const data = db
        .prepare(`SELECT * FROM leads WHERE ${whereSql} ORDER BY ${SORTABLE[sort]} ${direction}, id ${direction} LIMIT @limit OFFSET @offset`)
        .all({ ...params, limit, offset: (page - 1) * limit });

      res.json({ data, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } });
    } catch (err) {
      next(err);
    }
  });

  router.get('/:id', (req, res, next) => {
    try {
      const lead = db.prepare('SELECT * FROM leads WHERE id = ? AND user_id = ?').get(parseId(req.params.id), req.user.id);
      if (!lead) throw notFound('Lead not found');
      res.json(lead);
    } catch (err) {
      next(err);
    }
  });

  router.post('/', (req, res, next) => {
    try {
      const { errors, value } = validateLead(req.body);
      if (Object.keys(errors).length) throw validationError(errors);

      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO leads (user_id, name, email, phone, company, source, status)
           VALUES (@userId, @name, @email, @phone, @company, @source, @status)`
        )
        .run({ userId: req.user.id, ...value });

      res.status(201).json(db.prepare('SELECT * FROM leads WHERE id = ?').get(lastInsertRowid));
    } catch (err) {
      next(err);
    }
  });

  // Full update (PUT): the client sends the whole lead, including the new status.
  router.put('/:id', (req, res, next) => {
    try {
      const id = parseId(req.params.id);
      const existing = db.prepare('SELECT id FROM leads WHERE id = ? AND user_id = ?').get(id, req.user.id);
      if (!existing) throw notFound('Lead not found');

      const { errors, value } = validateLead(req.body);
      if (Object.keys(errors).length) throw validationError(errors);

      db.prepare(
        `UPDATE leads
            SET name=@name, email=@email, phone=@phone, company=@company,
                source=@source, status=@status, updated_at=datetime('now')
          WHERE id=@id AND user_id=@userId`
      ).run({ id, userId: req.user.id, ...value });

      res.json(db.prepare('SELECT * FROM leads WHERE id = ?').get(id));
    } catch (err) {
      next(err);
    }
  });

  router.delete('/:id', (req, res, next) => {
    try {
      const { changes } = db.prepare('DELETE FROM leads WHERE id = ? AND user_id = ?').run(parseId(req.params.id), req.user.id);
      if (!changes) throw notFound('Lead not found');
      res.status(204).end();
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = leadsRouter;
