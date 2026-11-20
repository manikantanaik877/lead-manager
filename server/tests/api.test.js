const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

const config = { jwtSecret: 'test-secret', jwtExpiresIn: '1h', corsOrigin: '*', authRateLimit: 1000 };

const validLead = {
  name: 'Asha Rao',
  email: 'asha@acme.com',
  phone: '+91 98765 43210',
  company: 'Acme Corp',
  source: 'Website',
  status: 'New',
};

let app;

beforeEach(() => {
  app = createApp(createDb(':memory:'), config);
});

async function signup(email = 'sales@example.com', name = 'Sales User') {
  const res = await request(app).post('/api/auth/signup').send({ name, email, password: 'password123' });
  assert.equal(res.status, 201);
  return res.body.token;
}

const authed = (token) => ({ Authorization: `Bearer ${token}` });

describe('auth', () => {
  test('signup returns a token and never exposes the password hash', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: 'A', email: 'a@b.com', password: 'password123' });
    assert.equal(res.status, 201);
    assert.ok(res.body.token);
    assert.equal(res.body.user.email, 'a@b.com');
    assert.equal(res.body.user.password_hash, undefined);
  });

  test('signup rejects invalid input with field errors', async () => {
    const res = await request(app).post('/api/auth/signup').send({ name: '', email: 'nope', password: 'short' });
    assert.equal(res.status, 422);
    assert.ok(res.body.details.name && res.body.details.email && res.body.details.password);
  });

  test('signup rejects a duplicate email (case-insensitive)', async () => {
    await signup('dup@example.com');
    const res = await request(app).post('/api/auth/signup').send({ name: 'B', email: 'DUP@example.com', password: 'password123' });
    assert.equal(res.status, 409);
  });

  test('login succeeds with correct credentials and fails with wrong ones', async () => {
    await signup('login@example.com');
    const ok = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'password123' });
    assert.equal(ok.status, 200);
    assert.ok(ok.body.token);

    const bad = await request(app).post('/api/auth/login').send({ email: 'login@example.com', password: 'wrong-password' });
    assert.equal(bad.status, 401);
    const unknown = await request(app).post('/api/auth/login').send({ email: 'ghost@example.com', password: 'password123' });
    assert.equal(unknown.status, 401);
  });

  test('/me returns the current user and requires a valid token', async () => {
    const token = await signup();
    const res = await request(app).get('/api/auth/me').set(authed(token));
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, 'sales@example.com');
    assert.equal((await request(app).get('/api/auth/me')).status, 401);
    assert.equal((await request(app).get('/api/auth/me').set(authed('garbage'))).status, 401);
  });
});

describe('leads', () => {
  test('requires authentication', async () => {
    assert.equal((await request(app).get('/api/leads')).status, 401);
    assert.equal((await request(app).post('/api/leads').send(validLead)).status, 401);
  });

  test('creates a lead and normalizes input', async () => {
    const token = await signup();
    const res = await request(app)
      .post('/api/leads')
      .set(authed(token))
      .send({ ...validLead, name: '  Asha Rao  ', email: 'ASHA@Acme.com' });
    assert.equal(res.status, 201);
    assert.equal(res.body.name, 'Asha Rao');
    assert.equal(res.body.email, 'asha@acme.com');
    assert.equal(res.body.status, 'New');
    assert.ok(res.body.id);
  });

  test('defaults status to New when omitted', async () => {
    const token = await signup();
    const { status, ...rest } = validLead;
    const res = await request(app).post('/api/leads').set(authed(token)).send(rest);
    assert.equal(res.status, 201);
    assert.equal(res.body.status, 'New');
  });

  test('validates required fields, email, phone, source and status', async () => {
    const token = await signup();
    const empty = await request(app).post('/api/leads').set(authed(token)).send({});
    assert.equal(empty.status, 422);
    for (const f of ['name', 'email', 'phone', 'company', 'source']) assert.ok(empty.body.details[f], `${f} should have an error`);

    const bad = await request(app)
      .post('/api/leads')
      .set(authed(token))
      .send({ ...validLead, email: 'not-an-email', phone: 'abc', source: 'Carrier Pigeon', status: 'Won' });
    assert.equal(bad.status, 422);
    assert.ok(bad.body.details.email && bad.body.details.phone && bad.body.details.source && bad.body.details.status);
  });

  test('rejects malformed JSON with 400', async () => {
    const token = await signup();
    const res = await request(app).post('/api/leads').set(authed(token)).set('Content-Type', 'application/json').send('{bad json');
    assert.equal(res.status, 400);
  });

  test('gets a single lead; 404 for missing, 400 for bad id', async () => {
    const token = await signup();
    const { body: created } = await request(app).post('/api/leads').set(authed(token)).send(validLead);
    assert.equal((await request(app).get(`/api/leads/${created.id}`).set(authed(token))).status, 200);
    assert.equal((await request(app).get('/api/leads/99999').set(authed(token))).status, 404);
    assert.equal((await request(app).get('/api/leads/abc').set(authed(token))).status, 400);
  });

  test('updates a lead including its status', async () => {
    const token = await signup();
    const { body: created } = await request(app).post('/api/leads').set(authed(token)).send(validLead);
    const res = await request(app)
      .put(`/api/leads/${created.id}`)
      .set(authed(token))
      .send({ ...validLead, company: 'Globex', status: 'Qualified' });
    assert.equal(res.status, 200);
    assert.equal(res.body.company, 'Globex');
    assert.equal(res.body.status, 'Qualified');

    const invalid = await request(app).put(`/api/leads/${created.id}`).set(authed(token)).send({ ...validLead, email: 'bad' });
    assert.equal(invalid.status, 422);
    assert.equal((await request(app).put('/api/leads/99999').set(authed(token))).status, 404);
  });

  test('deletes a lead', async () => {
    const token = await signup();
    const { body: created } = await request(app).post('/api/leads').set(authed(token)).send(validLead);
    assert.equal((await request(app).delete(`/api/leads/${created.id}`).set(authed(token))).status, 204);
    assert.equal((await request(app).get(`/api/leads/${created.id}`).set(authed(token))).status, 404);
    assert.equal((await request(app).delete(`/api/leads/${created.id}`).set(authed(token))).status, 404);
  });

  test("users cannot see, edit or delete each other's leads", async () => {
    const alice = await signup('alice@example.com', 'Alice');
    const bob = await signup('bob@example.com', 'Bob');
    const { body: lead } = await request(app).post('/api/leads').set(authed(alice)).send(validLead);

    const list = await request(app).get('/api/leads').set(authed(bob));
    assert.equal(list.body.pagination.total, 0);
    assert.equal((await request(app).get(`/api/leads/${lead.id}`).set(authed(bob))).status, 404);
    assert.equal((await request(app).put(`/api/leads/${lead.id}`).set(authed(bob)).send(validLead)).status, 404);
    assert.equal((await request(app).delete(`/api/leads/${lead.id}`).set(authed(bob))).status, 404);
    // Still intact for the owner.
    assert.equal((await request(app).get(`/api/leads/${lead.id}`).set(authed(alice))).status, 200);
  });
});

describe('search, filter, sort, pagination, stats', () => {
  let token;
  beforeEach(async () => {
    token = await signup();
    const seed = [
      { name: 'Alice Smith', company: 'Initech', status: 'New', source: 'Website' },
      { name: 'Bob Jones', company: 'Hooli', status: 'Contacted', source: 'Referral' },
      { name: 'Carol White', company: 'Pied Piper', status: 'Qualified', source: 'LinkedIn' },
      { name: 'Dan Brown', company: 'Initech', status: 'Lost', source: 'Event' },
      { name: 'Eve 100%_Match', company: 'Wildcard Inc', status: 'New', source: 'Other' },
    ];
    for (const [i, s] of seed.entries()) {
      const res = await request(app).post('/api/leads').set(authed(token)).send({ ...validLead, ...s, email: `u${i}@example.com` });
      assert.equal(res.status, 201);
    }
  });

  const list = (qs) => request(app).get(`/api/leads?${qs}`).set(authed(token));

  test('searches by name (case-insensitive, partial)', async () => {
    const res = await list('q=ALI');
    assert.deepEqual(res.body.data.map((l) => l.name), ['Alice Smith']);
  });

  test('searches by company and email too', async () => {
    assert.equal((await list('q=initech')).body.pagination.total, 2);
    assert.equal((await list('q=u2@example')).body.pagination.total, 1);
  });

  test('treats % and _ in the search term literally', async () => {
    const res = await list(`q=${encodeURIComponent('100%_')}`);
    assert.equal(res.body.pagination.total, 1);
    assert.equal((await list(`q=${encodeURIComponent('%')}`)).body.pagination.total, 1);
  });

  test('filters by status and combines with search', async () => {
    assert.equal((await list('status=New')).body.pagination.total, 2);
    assert.equal((await list('status=New&q=alice')).body.pagination.total, 1);
    assert.equal((await list('status=Lost&q=alice')).body.pagination.total, 0);
    assert.equal((await list('status=Bogus')).status, 400);
  });

  test('sorts ascending and descending, rejecting unknown columns', async () => {
    const asc = await list('sort=name&order=asc');
    assert.deepEqual(asc.body.data.map((l) => l.name)[0], 'Alice Smith');
    const desc = await list('sort=name&order=desc');
    assert.equal(desc.body.data[0].name, 'Eve 100%_Match');
    assert.equal((await list('sort=password_hash')).status, 400);
    assert.equal((await list('sort=name;DROP TABLE leads')).status, 400);
    assert.equal((await list('order=sideways')).status, 400);
  });

  test('paginates with correct metadata and no overlap between pages', async () => {
    const p1 = await list('limit=2&page=1&sort=name&order=asc');
    const p2 = await list('limit=2&page=2&sort=name&order=asc');
    const p3 = await list('limit=2&page=3&sort=name&order=asc');
    assert.deepEqual(p1.body.pagination, { page: 1, limit: 2, total: 5, totalPages: 3 });
    assert.equal(p1.body.data.length, 2);
    assert.equal(p2.body.data.length, 2);
    assert.equal(p3.body.data.length, 1);
    const ids = [...p1.body.data, ...p2.body.data, ...p3.body.data].map((l) => l.id);
    assert.equal(new Set(ids).size, 5);
  });

  test('caps the page size and tolerates junk paging params', async () => {
    const res = await list('limit=9999&page=-4');
    assert.equal(res.status, 200);
    assert.equal(res.body.pagination.limit, 100);
    assert.equal(res.body.pagination.page, 1);
  });

  test('stats returns totals per status, including zero counts', async () => {
    const res = await request(app).get('/api/leads/stats').set(authed(token));
    assert.equal(res.status, 200);
    assert.deepEqual(res.body, { total: 5, byStatus: { New: 2, Contacted: 1, Qualified: 1, Lost: 1 } });

    const other = await signup('other@example.com');
    const empty = await request(app).get('/api/leads/stats').set(authed(other));
    assert.deepEqual(empty.body, { total: 0, byStatus: { New: 0, Contacted: 0, Qualified: 0, Lost: 0 } });
  });

  test('meta exposes the allowed statuses and sources', async () => {
    const res = await request(app).get('/api/leads/meta').set(authed(token));
    assert.deepEqual(res.body.statuses, ['New', 'Contacted', 'Qualified', 'Lost']);
    assert.ok(res.body.sources.includes('Website'));
  });
});

describe('misc', () => {
  test('health check and JSON 404 for unknown API routes', async () => {
    assert.equal((await request(app).get('/api/health')).body.status, 'ok');
    const res = await request(app).get('/api/nope');
    assert.equal(res.status, 404);
    assert.ok(res.body.error);
  });
});
