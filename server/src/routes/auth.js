const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validateSignup, validateLogin } = require('../validation');
const { validationError, conflict, unauthorized } = require('../errors');
const { requireAuth } = require('../middleware');

// Compared against when the email is unknown so response time doesn't leak which emails exist.
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 10);

function authRouter(db, { jwtSecret, jwtExpiresIn }) {
  const router = express.Router();

  const publicUser = (u) => ({ id: u.id, name: u.name, email: u.email });
  const signToken = (user) => jwt.sign({ sub: user.id }, jwtSecret, { expiresIn: jwtExpiresIn });

  router.post('/signup', (req, res, next) => {
    try {
      const { errors, value } = validateSignup(req.body);
      if (Object.keys(errors).length) throw validationError(errors);

      if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(value.email)) {
        throw conflict('An account with this email already exists', { email: 'Email is already registered' });
      }

      const hash = bcrypt.hashSync(value.password, 10);
      const { lastInsertRowid } = db
        .prepare('INSERT INTO users (name, email, password_hash) VALUES (?, ?, ?)')
        .run(value.name, value.email, hash);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid);

      res.status(201).json({ token: signToken(user), user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  });

  router.post('/login', (req, res, next) => {
    try {
      const { errors, value } = validateLogin(req.body);
      if (Object.keys(errors).length) throw validationError(errors);

      const user = db.prepare('SELECT * FROM users WHERE email = ?').get(value.email);
      const ok = bcrypt.compareSync(value.password, user ? user.password_hash : DUMMY_HASH);
      if (!user || !ok) throw unauthorized('Invalid email or password');

      res.json({ token: signToken(user), user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  });

  router.get('/me', requireAuth(jwtSecret), (req, res, next) => {
    try {
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      if (!user) throw unauthorized('Account no longer exists');
      res.json({ user: publicUser(user) });
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = authRouter;
