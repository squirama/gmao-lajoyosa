const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const CorrectiveActionController = require('../controllers/CorrectiveActionController');
const { createFakeClient, createReply } = require('./helpers');

test('getCorrectiveActions filtra por departamentos asignados al admin limitado', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE session_token = $1 AND active = true') {
            return { rows: [{ id: 7, role: 'ADMIN', location_id: null }] };
        }

        if (sql === 'SELECT department_id FROM user_departments WHERE user_id = $1') {
            assert.equal(params[0], 7);
            return { rows: [{ department_id: 3 }] };
        }

        if (sql.startsWith('SELECT l.id, l.asset_id, l.user_id, l.created_at')) {
            assert.deepEqual(params[0], [3]);
            return {
                rows: [{
                    id: 12,
                    classification: 'CORRECTIVE_ACTION',
                    impact_level: 'POTENTIAL',
                    follow_up_required: true,
                    follow_up_status: 'OPEN',
                    asset_name: 'Llenadora 1',
                }],
            };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await CorrectiveActionController.getCorrectiveActions({
            headers: { authorization: 'Bearer token-admin' },
            query: {},
        }, createReply());

        assert.equal(result.length, 1);
        assert.equal(result[0].follow_up_status, 'OPEN');
    } finally {
        db.connect = originalConnect;
    }
});

test('updateCorrectiveAction cierra el seguimiento cuando el admin tiene alcance', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE session_token = $1 AND active = true') {
            return { rows: [{ id: 7, role: 'ADMIN', location_id: null }] };
        }

        if (sql === 'SELECT department_id FROM user_departments WHERE user_id = $1') {
            return { rows: [{ department_id: 3 }] };
        }

        if (sql.startsWith('SELECT l.id FROM intervention_logs l JOIN assets a ON l.asset_id = a.id')) {
            assert.equal(params[0], 12);
            assert.deepEqual(params[1], [3]);
            return { rows: [{ id: 12 }] };
        }

        if (sql.startsWith('UPDATE intervention_logs SET classification = COALESCE($1, classification)')) {
            assert.equal(params[2], null);
            assert.equal(params[6], 'CLOSED');
            assert.equal(params[8], 7);
            assert.equal(params[9], 'Admin');
            assert.equal(params[10], 12);
            return { rows: [{ id: 12, follow_up_status: 'CLOSED' }] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await CorrectiveActionController.updateCorrectiveAction({
            headers: { authorization: 'Bearer token-admin' },
            params: { id: 12 },
            body: {
                classification: 'CORRECTIVE_ACTION',
                impact_level: 'POTENTIAL',
                probable_cause: 'Holgura',
                preventive_action: 'Ajuste',
                follow_up_required: true,
                follow_up_status: 'CLOSED',
                follow_up_notes: 'Revisado',
            },
        }, createReply());

        assert.equal(result.follow_up_status, 'CLOSED');
    } finally {
        db.connect = originalConnect;
    }
});
