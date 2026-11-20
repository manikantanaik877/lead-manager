const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const authRouter = require('./routes/auth');
const leadsRouter = require('./routes/leads');
const { requireAuth, errorHandler, notFoundHandler } = require('./middleware');

/**
 * Build the Express app. The database and config are injected so tests can
 * run against an in-memory database without touching process.env.
 */
function createApp(db, config) {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: config.corsOrigin === '*' ? true : config.corsOrigin.split(',').map((s) => s.trim()) }));
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));

  // Throttle credential endpoints to slow down brute-force attempts.
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: config.authRateLimit ?? 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many attempts, please try again later' },
  });
  app.use('/api/auth', authLimiter, authRouter(db, config));
  app.use('/api/leads', requireAuth(config.jwtSecret), leadsRouter(db));

  // Unknown /api routes get a JSON 404 rather than falling through to the SPA.
  app.use('/api', notFoundHandler);

  // Optional single-service deployment: serve the built frontend from this process.
  if (config.clientDist) {
    app.use(express.static(config.clientDist));
    app.get('*', (_req, res) => res.sendFile(path.join(config.clientDist, 'index.html')));
  } else {
    app.use(notFoundHandler);
  }

  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
