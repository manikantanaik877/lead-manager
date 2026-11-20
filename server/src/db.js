const Database = require('better-sqlite3');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT    NOT NULL,
  email         TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  password_hash TEXT    NOT NULL,
  created_at    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS leads (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT    NOT NULL,
  email      TEXT    NOT NULL,
  phone      TEXT    NOT NULL,
  company    TEXT    NOT NULL,
  source     TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'New'
             CHECK (status IN ('New','Contacted','Qualified','Lost')),
  created_at TEXT    NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT    NOT NULL DEFAULT (datetime('now'))
);

-- Every query is scoped to a user; these cover the filter + sort paths.
CREATE INDEX IF NOT EXISTS idx_leads_user_status  ON leads (user_id, status);
CREATE INDEX IF NOT EXISTS idx_leads_user_created ON leads (user_id, created_at);
`;

function createDb(file = './data/leads.db') {
  if (file !== ':memory:') {
    // Make sure the directory exists so first run "just works".
    require('fs').mkdirSync(require('path').dirname(file), { recursive: true });
  }
  const db = new Database(file);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  db.exec(SCHEMA);
  return db;
}

module.exports = { createDb };
