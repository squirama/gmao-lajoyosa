const test = require('node:test');
const assert = require('node:assert/strict');

const db = require('../db');
const LogController = require('../controllers/LogController');
const { createFakeClient, createReply } = require('./helpers');

test('createLog guarda document_path en intervention_logs', async () => {
    const originalConnect = db.connect;
    const emailService = require('../services/emailService');
    const originalSendEmail = emailService.sendEmail;
    const controllerPath = require.resolve('../controllers/LogController');
    delete require.cache[controllerPath];

    emailService.sendEmail = async () => true;

    const LogControllerWithEmailStub = require('../controllers/LogController');

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') {
            return { rows: [] };
        }

        if (sql.startsWith('INSERT INTO intervention_logs ( asset_id, user_id, global_comment, duration_minutes, solution, document_path, classification, impact_level, probable_cause, preventive_action, follow_up_required, follow_up_status ) VALUES')) {
            assert.equal(params[5], '["/documents/averia.pdf"]');
            assert.equal(params[6], 'CORRECTION');
            assert.equal(params[7], 'NONE');
            assert.equal(params[10], false);
            assert.equal(params[11], 'NOT_REQUIRED');
            return { rows: [{ id: 41 }] };
        }

        if (sql.startsWith('INSERT INTO intervention_tasks')) {
            return { rows: [] };
        }

        if (sql === 'SELECT full_name FROM users WHERE id = $1') {
            return { rows: [{ full_name: 'Operario Test' }] };
        }

        if (sql.startsWith('SELECT d.email as dept_email, l.email as loc_email')) {
            return { rows: [{ dept_email: 'dept@example.com', loc_email: null }] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await LogControllerWithEmailStub.createLog({
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
        emailService.sendEmail = originalSendEmail;
        delete require.cache[controllerPath];
        require('../controllers/LogController');
    }
});

test('createLog envia correo si hay comentario o solucion aunque no haya campana', async () => {
    const originalConnect = db.connect;
    const emailService = require('../services/emailService');
    const originalSendEmail = emailService.sendEmail;
    const controllerPath = require.resolve('../controllers/LogController');
    delete require.cache[controllerPath];

    let emailSent = false;
    emailService.sendEmail = async () => {
        emailSent = true;
        return true;
    };

    const LogControllerWithEmailStub = require('../controllers/LogController');

    const client = createFakeClient(async (sql, params) => {
        if (sql === 'BEGIN' || sql === 'COMMIT') {
            return { rows: [] };
        }

        if (sql.startsWith('INSERT INTO intervention_logs ( asset_id, user_id, global_comment, duration_minutes, solution, document_path, classification, impact_level, probable_cause, preventive_action, follow_up_required, follow_up_status ) VALUES')) {
            assert.equal(params[6], 'CORRECTION');
            assert.equal(params[10], true);
            assert.equal(params[11], 'OPEN');
            return { rows: [{ id: 52 }] };
        }

        if (sql.startsWith('INSERT INTO intervention_tasks')) {
            return { rows: [] };
        }

        if (sql === 'SELECT full_name FROM users WHERE id = $1') {
            return { rows: [{ full_name: 'Operario Test' }] };
        }

        if (sql.startsWith('SELECT d.email as dept_email, l.email as loc_email')) {
            return { rows: [{ dept_email: 'dept@example.com', loc_email: null }] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    db.connect = async () => client;

    try {
        const result = await LogControllerWithEmailStub.createLog({
            body: {
                asset_id: 8,
                user_id: 2,
                global_comment: 'Se detecta fuga leve',
                duration_minutes: 12,
                solution: '',
                document_path: null,
                tasks: [{
                    description: 'AVERIA GENERAL / MANTENIMIENTO CORRECTIVO',
                    checked: true,
                    alert: false,
                    comment: 'Ajuste rapido',
                }],
                consumed_parts: [],
            },
        }, createReply());

        assert.deepEqual(result, { success: true, id: 52 });
        assert.equal(emailSent, true);
    } finally {
        db.connect = originalConnect;
        emailService.sendEmail = originalSendEmail;
        delete require.cache[controllerPath];
        require('../controllers/LogController');
    }
});
