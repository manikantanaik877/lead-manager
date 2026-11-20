require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { createDb } = require('./db');
const { createApp } = require('./app');

const isProd = process.env.NODE_ENV === 'production';

if (isProd && !process.env.JWT_SECRET) {
  console.error('JWT_SECRET must be set in production');
  process.exit(1);
}

// If the frontend has been built, serve it from this process (single-service deploys).
const clientDist = path.resolve(__dirname, '../../client/dist');

const config = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  clientDist: fs.existsSync(clientDist) ? clientDist : null,
};

const db = createDb(process.env.DATABASE_FILE || './data/leads.db');
const app = createApp(db, config);

app.listen(config.port, () => console.log(`Lead Manager listening on http://localhost:${config.port}`));
