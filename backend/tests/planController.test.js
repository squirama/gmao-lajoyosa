const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const PlanController = require('../controllers/PlanController');
const { createFakeClient, createReply } = require('./helpers');

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

test('reschedulePlan devuelve 400 si falta new_date', async () => {
    const reply = createReply();
    const result = await PlanController.reschedulePlan({
        body: {},
        params: { id: '12' },
    }, reply);

    assert.equal(reply.getStatusCode(), 400);
    assert.deepEqual(result, { error: 'Missing new_date' });
});

test('skipPlan avanza la fecha y limpia alertas pendientes', async () => {
    const originalConnect = db.connect;
    let updatedDueDate = null;
    let deletedAlerts = false;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [] };
        }

        if (sql === 'SELECT * FROM maintenance_plans WHERE id = $1') {
            return {
                rows: [{
                    id: 7,
                    frequency_days: 7,
                    next_due_date: '2026-03-10',
                    start_date: '2026-03-10',
                    force_dow: false,
                }],
            };
        }

        if (sql === 'UPDATE maintenance_plans SET next_due_date = $1 WHERE id = $2') {
            updatedDueDate = params[0];
            return { rows: [] };
        }

        if (sql === 'DELETE FROM pending_alerts WHERE plan_id = $1') {
            deletedAlerts = true;
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await PlanController.skipPlan({
            params: { id: '7' },
        }, createReply());

        assert.equal(result.success, true);
        assert.equal(formatLocalDate(updatedDueDate), '2026-03-17');
        assert.equal(formatLocalDate(result.new_date), '2026-03-17');
        assert.equal(deletedAlerts, true);
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});

test('completePlan registra historial, actualiza siguiente fecha y limpia estado runtime', async () => {
    const originalConnect = db.connect;
    let historyInserted = false;
    let completedPlanDate = null;
    let deletedAlerts = false;
    let deletedExceptions = false;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [] };
        }

        if (sql.startsWith('SELECT p.*, a.name as asset_name FROM maintenance_plans p JOIN assets a ON p.asset_id = a.id WHERE p.id = $1')) {
            return {
                rows: [{
                    id: 9,
                    asset_id: 4,
                    asset_name: 'Compresor',
                    task_description: 'Revision',
                    frequency_days: 30,
                    next_due_date: '2026-03-10',
                    start_date: '2026-03-10',
                    force_dow: false,
                }],
            };
        }

        if (sql.startsWith('INSERT INTO maintenance_history ( plan_id, asset_id, operator_id, performed_date, notes, document_path ) VALUES')) {
            historyInserted = true;
            assert.equal(params[0], '9');
            assert.equal(params[1], 4);
            assert.equal(params[2], 22);
            assert.equal(params[3], 'OK');
            assert.equal(params[4], '/documents/parte.pdf');
            return { rows: [{ id: 101 }] };
        }

        if (sql === 'UPDATE maintenance_plans SET next_due_date = $1, last_performed = CURRENT_DATE WHERE id = $2') {
            completedPlanDate = params[0];
            assert.equal(params[1], '9');
            return { rows: [] };
        }

        if (sql === 'DELETE FROM pending_alerts WHERE plan_id = $1') {
            deletedAlerts = true;
            return { rows: [] };
        }

        if (sql === 'DELETE FROM plan_exceptions WHERE plan_id = $1 AND original_date <= $2') {
            deletedExceptions = true;
            assert.equal(params[0], '9');
            assert.equal(String(params[1]).slice(0, 10), '2026-03-10');
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await PlanController.completePlan({
            params: { id: '9' },
            body: {
                operator_id: 22,
                notes: 'OK',
                alert: false,
                document_path: '/documents/parte.pdf',
                consumed_parts: [],
            },
        }, createReply());

        assert.equal(result.success, true);
        assert.equal(historyInserted, true);
        assert.equal(formatLocalDate(completedPlanDate), '2026-04-09');
        assert.equal(formatLocalDate(result.next_due_date), '2026-04-09');
        assert.equal(deletedAlerts, true);
        assert.equal(deletedExceptions, true);
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});
