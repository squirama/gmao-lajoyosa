const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const LogController = require('../controllers/LogController');
const { createFakeClient, createReply } = require('./helpers');

test('createLog guarda document_path en intervention_logs', async () => {
    const originalConnect = db.connect;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') {
            return { rows: [] };
        }

        if (sql.startsWith('INSERT INTO intervention_logs (asset_id, user_id, global_comment, duration_minutes, solution, document_path) VALUES')) {
            assert.equal(params[5], '["/documents/averia.pdf"]');
            return { rows: [{ id: 41 }] };
        }

        if (sql.startsWith('INSERT INTO intervention_tasks')) {
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await LogController.createLog({
            body: {
                asset_id: 8,
                user_id: 2,
                global_comment: 'Cambio de sensor',
                duration_minutes: 25,
                solution: 'Sustitucion y prueba',
                document_path: '["/documents/averia.pdf"]',
                tasks: [{
                    description: 'AVERIA GENERAL / MANTENIMIENTO CORRECTIVO',
                    checked: true,
                    alert: false,
                    comment: 'Sensor averiado',
                }],
                consumed_parts: [],
            },
        }, createReply());

        assert.deepEqual(result, { success: true, id: 41 });
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});
