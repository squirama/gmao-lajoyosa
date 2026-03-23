const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

const db = require('../db');
const AuthController = require('../controllers/AuthController');
const { hashPassword } = require('../utils/passwords');
const { createReply, normalizeSql } = require('./helpers');

test('login devuelve 400 si faltan credenciales', async () => {
    const reply = createReply();
    const result = await AuthController.login({ body: { username: '', password: '' } }, reply);

    assert.equal(reply.getStatusCode(), 400);
    assert.deepEqual(result, { error: 'Usuario y contrasena requeridos' });
});

test('login valida password scrypt y actualiza session_token', async () => {
    const originalQuery = db.query;
    const calls = [];

    db.query = async (sql, params) => {
        const normalized = normalizeSql(sql);
        calls.push({ sql: normalized, params });

        if (normalized === 'SELECT * FROM users WHERE username = $1 AND active = true') {
            return {
                rows: [{
                    id: 9,
                    username: 'admin',
                    full_name: 'Admin',
                    role: 'ADMIN',
                    location_id: 4,
                    password_hash: hashPassword('Secreto123'),
                }],
            };
        }

        if (normalized === 'UPDATE users SET session_token = $1 WHERE id = $2') {
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${normalized}`);
    };

    try {
        const reply = createReply();
        const result = await AuthController.login({
            body: { username: 'admin', password: 'Secreto123' },
        }, reply);

        assert.equal(reply.getStatusCode(), 200);
        assert.equal(result.user.username, 'admin');
        assert.equal(result.user.role, 'ADMIN');
        assert.match(result.token, /^[a-f0-9]{64}$/);
        assert.equal(calls.length, 2);
        assert.equal(calls[1].sql, 'UPDATE users SET session_token = $1 WHERE id = $2');
        assert.equal(calls[1].params[1], 9);
    } finally {
        db.query = originalQuery;
    }
});

test('login acepta hash legacy y fuerza rehash', async () => {
    const originalQuery = db.query;
    const calls = [];
    const legacyHash = crypto.createHash('sha256').update('legacy-pass').digest('hex');

    db.query = async (sql, params) => {
        const normalized = normalizeSql(sql);
        calls.push({ sql: normalized, params });

        if (normalized === 'SELECT * FROM users WHERE username = $1 AND active = true') {
            return {
                rows: [{
                    id: 3,
                    username: 'legacy',
                    full_name: 'Legacy User',
                    role: 'ADMIN',
                    location_id: 2,
                    password_hash: legacyHash,
                }],
            };
        }

        if (normalized === 'UPDATE users SET session_token = $1, password_hash = $2 WHERE id = $3') {
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${normalized}`);
    };

    try {
        const reply = createReply();
        const result = await AuthController.login({
            body: { username: 'legacy', password: 'legacy-pass' },
        }, reply);

        assert.equal(reply.getStatusCode(), 200);
        assert.equal(result.user.username, 'legacy');
        assert.equal(calls[1].sql, 'UPDATE users SET session_token = $1, password_hash = $2 WHERE id = $3');
        assert.match(calls[1].params[0], /^[a-f0-9]{64}$/);
        assert.match(calls[1].params[1], /^scrypt\$/);
        assert.equal(calls[1].params[2], 3);
    } finally {
        db.query = originalQuery;
    }
});
