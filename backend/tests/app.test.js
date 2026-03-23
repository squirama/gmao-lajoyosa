const test = require('node:test');
const assert = require('node:assert/strict');

const { buildApp } = require('../app');

test('GET /health responde ok', async (t) => {
    const app = await buildApp({ logger: false });
    t.after(() => app.close());

    const response = await app.inject({
        method: 'GET',
        url: '/health',
    });

    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { status: 'ok' });
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
