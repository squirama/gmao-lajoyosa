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
    assert.deepEqual(result, { error: 'new_date es obligatorio' });
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
    let deletedScheduledAlert = false;
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

        if (sql === 'SELECT scheduled_date FROM maintenance_history WHERE plan_id = $1 AND scheduled_date IS NOT NULL ORDER BY scheduled_date ASC') {
            return { rows: [] };
        }

        if (sql.startsWith('INSERT INTO maintenance_history ( plan_id, asset_id, operator_id, scheduled_date, performed_date, notes, document_path ) VALUES')) {
            historyInserted = true;
            assert.equal(params[0], 9);
            assert.equal(params[1], 4);
            assert.equal(params[2], 22);
            assert.equal(formatLocalDate(params[3]), '2026-03-10');
            assert.equal(params[4], 'OK');
            assert.equal(params[5], '/documents/parte.pdf');
            return { rows: [{ id: 101 }] };
        }

        if (sql === 'SELECT full_name FROM users WHERE id = $1') {
            assert.equal(params[0], 22);
            return { rows: [{ full_name: 'Operario Test' }] };
        }

        if (sql === 'UPDATE maintenance_plans SET next_due_date = $1, last_performed = CURRENT_DATE WHERE id = $2') {
            completedPlanDate = params[0];
            assert.equal(params[1], 9);
            return { rows: [] };
        }

        if (sql === 'DELETE FROM pending_alerts WHERE plan_id = $1 AND scheduled_date = $2') {
            deletedScheduledAlert = true;
            assert.equal(params[0], 9);
            assert.equal(formatLocalDate(params[1]), '2026-03-10');
            return { rows: [] };
        }

        if (sql === 'DELETE FROM plan_exceptions WHERE plan_id = $1 AND (original_date = $2 OR new_date = $2)') {
            deletedExceptions = true;
            assert.equal(params[0], 9);
            assert.equal(formatLocalDate(params[1]), '2026-03-10');
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
        assert.equal(deletedScheduledAlert, true);
        assert.equal(deletedExceptions, true);
        assert.equal(client.wasReleased(), true);
    } finally {
        db.connect = originalConnect;
    }
});

test('completePlan deja el vencido antiguo pendiente si se completa una ocurrencia posterior', async () => {
    const originalConnect = db.connect;
    let completedPlanDate = null;
    let insertedScheduledDate = null;

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [] };
        }

        if (sql.startsWith('SELECT p.*, a.name as asset_name FROM maintenance_plans p JOIN assets a ON p.asset_id = a.id WHERE p.id = $1')) {
            return {
                rows: [{
                    id: 15,
                    asset_id: 5,
                    asset_name: 'Linea 2',
                    task_description: 'Revision semanal',
                    frequency_days: 7,
                    next_due_date: '2026-03-01',
                    start_date: '2026-03-01',
                    force_dow: false,
                }],
            };
        }

        if (sql === 'SELECT scheduled_date FROM maintenance_history WHERE plan_id = $1 AND scheduled_date IS NOT NULL ORDER BY scheduled_date ASC') {
            return {
                rows: [{ scheduled_date: '2026-03-08' }],
            };
        }

        if (sql.startsWith('INSERT INTO maintenance_history ( plan_id, asset_id, operator_id, scheduled_date, performed_date, notes, document_path ) VALUES')) {
            insertedScheduledDate = params[3];
            return { rows: [{ id: 303 }] };
        }

        if (sql === 'SELECT full_name FROM users WHERE id = $1') {
            assert.equal(params[0], 22);
            return { rows: [{ full_name: 'Operario Test' }] };
        }

        if (sql === 'UPDATE maintenance_plans SET next_due_date = $1, last_performed = CURRENT_DATE WHERE id = $2') {
            completedPlanDate = params[0];
            return { rows: [] };
        }

        if (sql === 'DELETE FROM pending_alerts WHERE plan_id = $1 AND scheduled_date = $2') {
            return { rows: [] };
        }

        if (sql === 'DELETE FROM plan_exceptions WHERE plan_id = $1 AND (original_date = $2 OR new_date = $2)') {
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await PlanController.completePlan({
            params: { id: '15' },
            body: {
                operator_id: 22,
                notes: 'Hecho el actual',
                alert: false,
                document_path: null,
                consumed_parts: [],
                scheduled_date: '2026-03-15',
            },
        }, createReply());

        assert.equal(result.success, true);
        assert.equal(String(insertedScheduledDate).slice(0, 10), '2026-03-15');
        assert.equal(formatLocalDate(completedPlanDate), '2026-03-01');
        assert.equal(formatLocalDate(result.next_due_date), '2026-03-01');
    } finally {
        db.connect = originalConnect;
    }
});

test('completePlan envia correo si hay observaciones o solucion sin campana', async () => {
    const originalConnect = db.connect;
    const emailService = require('../services/emailService');
    const originalSendEmail = emailService.sendEmail;
    const controllerPath = require.resolve('../controllers/PlanController');
    delete require.cache[controllerPath];

    let emailSent = false;
    emailService.sendEmail = async () => {
        emailSent = true;
        return true;
    };

    const PlanControllerWithEmailStub = require('../controllers/PlanController');

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
            return { rows: [] };
        }

        if (sql.startsWith('SELECT p.*, a.name as asset_name FROM maintenance_plans p JOIN assets a ON p.asset_id = a.id WHERE p.id = $1')) {
            return {
                rows: [{
                    id: 18,
                    asset_id: 6,
                    asset_name: 'Envasadora',
                    task_description: 'Revision semanal',
                    frequency_days: 7,
                    next_due_date: '2026-03-10',
                    start_date: '2026-03-10',
                    force_dow: false,
                }],
            };
        }

        if (sql === 'SELECT scheduled_date FROM maintenance_history WHERE plan_id = $1 AND scheduled_date IS NOT NULL ORDER BY scheduled_date ASC') {
            return { rows: [] };
        }

        if (sql.startsWith('INSERT INTO maintenance_history ( plan_id, asset_id, operator_id, scheduled_date, performed_date, notes, document_path ) VALUES')) {
            return { rows: [{ id: 401 }] };
        }

        if (sql === 'SELECT full_name FROM users WHERE id = $1') {
            return { rows: [{ full_name: 'Operario Test' }] };
        }

        if (sql === 'UPDATE maintenance_plans SET next_due_date = $1, last_performed = CURRENT_DATE WHERE id = $2') {
            return { rows: [] };
        }

        if (sql === 'DELETE FROM pending_alerts WHERE plan_id = $1 AND scheduled_date = $2') {
            return { rows: [] };
        }

        if (sql === 'DELETE FROM plan_exceptions WHERE plan_id = $1 AND (original_date = $2 OR new_date = $2)') {
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await PlanControllerWithEmailStub.completePlan({
            params: { id: '18' },
            body: {
                operator_id: 31,
                notes: 'Se detecta desgaste leve',
                solution: 'Ajuste y engrase',
                alert: false,
                document_path: null,
                consumed_parts: [],
            },
        }, createReply());

        assert.equal(result.success, true);
        assert.equal(emailSent, true);
    } finally {
        db.connect = originalConnect;
        emailService.sendEmail = originalSendEmail;
        delete require.cache[controllerPath];
        require('../controllers/PlanController');
    }
});
