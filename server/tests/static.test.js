const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const request = require('supertest');
const { createDb } = require('../src/db');
const { createApp } = require('../src/app');

test('serves the built frontend, falls back to index.html for client routes, and keeps /api JSON 404s', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'lm-dist-'));
  fs.writeFileSync(path.join(dir, 'index.html'), '<title>Lead Manager</title>');
  const app = createApp(createDb(':memory:'), {
    jwtSecret: 's', jwtExpiresIn: '1h', corsOrigin: '*', clientDist: dir,
  });

  const root = await request(app).get('/');
  assert.equal(root.status, 200);
  assert.match(root.text, /Lead Manager/);

  const deepLink = await request(app).get('/some/client/route');
  assert.equal(deepLink.status, 200);
  assert.match(deepLink.text, /Lead Manager/);

  const api = await request(app).get('/api/nope');
  assert.equal(api.status, 404);
  assert.ok(api.body.error);

  fs.rmSync(dir, { recursive: true });
});
