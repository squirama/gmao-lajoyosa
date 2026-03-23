const test = require('node:test');
const assert = require('node:assert/strict');

const { buildApp } = require('../app');
const db = require('../db');

test('GET /health responde ok', async (t) => {
    const originalQuery = db.query;
    db.query = async () => ({ rows: [{ ok: 1 }] });

    const app = await buildApp({ logger: false });
    t.after(async () => {
        db.query = originalQuery;
        await app.close();
    });

    const response = await app.inject({
        method: 'GET',
        url: '/health',
    });

    assert.equal(response.statusCode, 200);
    assert.equal(response.json().status, 'ok');
    assert.equal(response.json().database, 'ok');
    assert.equal(typeof response.json().uptime_seconds, 'number');
});

test('GET /api/config sin auth devuelve 401', async (t) => {
    const app = await buildApp({ logger: false });
    t.after(() => app.close());

    const response = await app.inject({
        method: 'GET',
        url: '/api/config',
    });

    assert.equal(response.statusCode, 401);
    assert.match(response.headers['www-authenticate'] || '', /Basic realm="Admin Access", Bearer/);
});
