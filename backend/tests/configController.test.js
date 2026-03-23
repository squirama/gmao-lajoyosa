const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const ConfigController = require('../controllers/ConfigController');
const { createFakeClient, createReply } = require('./helpers');

test('getConfig devuelve listas vacias para operario sin departamentos', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE session_token = $1 AND active = true') {
            return {
                rows: [{
                    id: 21,
                    role: 'OPERATOR',
                    location_id: null,
                    full_name: 'Operario',
                }],
            };
        }

        if (sql === 'SELECT department_id FROM user_departments WHERE user_id = $1') {
            assert.equal(params[0], 21);
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await ConfigController.getConfig({
            headers: { authorization: 'Bearer token-op' },
        }, createReply());

        assert.deepEqual(result, {
            locations: [],
            departments: [],
            assets: [],
            plans: [],
            stats: [],
        });
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});

test('getCalendarEvents devuelve vacio para operario sin departamentos', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE session_token = $1 AND active = true') {
            return {
                rows: [{
                    id: 22,
                    role: 'OPERATOR',
                    location_id: null,
                }],
            };
        }

        if (sql === 'SELECT department_id FROM user_departments WHERE user_id = $1') {
            assert.equal(params[0], 22);
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await ConfigController.getCalendarEvents({
            headers: { authorization: 'Bearer token-op' },
            query: {},
        }, createReply());

        assert.deepEqual(result, []);
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});

test('getCalendarEvents devuelve vacio si el operario pide un departamento fuera de su alcance', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE session_token = $1 AND active = true') {
            return {
                rows: [{
                    id: 23,
                    role: 'OPERATOR',
                    location_id: null,
                }],
            };
        }

        if (sql === 'SELECT department_id FROM user_departments WHERE user_id = $1') {
            assert.equal(params[0], 23);
            return { rows: [{ department_id: 3 }] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await ConfigController.getCalendarEvents({
            headers: { authorization: 'Bearer token-op' },
            query: { department_id: '7' },
        }, createReply());

        assert.deepEqual(result, []);
        assert.equal(client.getQueries().length, 2);
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});
