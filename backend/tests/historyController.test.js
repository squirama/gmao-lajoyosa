const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const HistoryController = require('../controllers/HistoryController');
const { createFakeClient, createReply } = require('./helpers');

test('getMaintenanceHistory devuelve historial scopeado por sede admin y con filtros', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'SELECT * FROM users WHERE session_token = $1 AND active = true') {
            return {
                rows: [{
                    id: 4,
                    role: 'ADMIN',
                    location_id: 3,
                    full_name: 'Admin Sede',
                }],
            };
        }

        if (sql.includes('FROM maintenance_history h')) {
            assert.equal(params[0], 3);
            assert.equal(params[1], '2026-03-01');
            assert.equal(params[2], '2026-03-31');
            assert.equal(params[3], 9);
            assert.match(sql, /h\.document_path IS NOT NULL/);
            return {
                rows: [{
                    id: 99,
                    asset_name: 'Llenadora 1',
                    task_description: 'Revision mensual',
                    document_path: '["/documents/parte.pdf"]',
                    entry_type: 'preventive',
                }],
            };
        }

        if (sql.includes('FROM intervention_logs l')) {
            assert.equal(params[0], 3);
            assert.equal(params[1], '2026-03-01');
            assert.equal(params[2], '2026-03-31');
            assert.equal(params[3], 9);
            assert.match(sql, /l\.document_path IS NOT NULL/);
            return {
                rows: [{
                    id: 100,
                    asset_name: 'Llenadora 1',
                    task_description: 'Averia general',
                    document_path: '["/documents/correctivo.pdf"]',
                    entry_type: 'corrective',
                    created_at: '2026-03-20T08:30:00.000Z',
                }],
            };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await HistoryController.getMaintenanceHistory({
            headers: { authorization: 'Bearer token-admin' },
            query: {
                start: '2026-03-01',
                end: '2026-03-31',
                asset_id: '9',
                with_documents: 'true',
            },
        }, createReply());

        assert.equal(result.length, 2);
        assert.equal(result[0].entry_type, 'corrective');
        assert.equal(result[1].entry_type, 'preventive');
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});

test('getMaintenanceHistory valida fechas invalidas', async () => {
    const reply = createReply();

    const response = await HistoryController.getMaintenanceHistory({
        headers: { authorization: 'Bearer token-admin' },
        query: { start: '2026/03/01' },
    }, reply);

    assert.deepEqual(response, { error: 'start debe tener formato YYYY-MM-DD' });
    assert.equal(reply.getStatusCode(), 400);
});
