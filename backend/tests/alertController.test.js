const test = require('node:test');
const assert = require('node:assert/strict');

const { createFakeClient } = require('./helpers');

test('sendWeeklyDepartmentReminders envia el resumen semanal del area una sola vez por lunes', async () => {
    const emailService = require('../services/emailService');
    const originalSendEmail = emailService.sendEmail;
    const controllerPath = require.resolve('../controllers/AlertController');
    delete require.cache[controllerPath];

    const sentEmails = [];
    emailService.sendEmail = async (payload) => {
        sentEmails.push(payload);
        return true;
    };

    const AlertController = require('../controllers/AlertController');

    const client = createFakeClient(async (sql, params) => {
        if (sql.startsWith('SELECT d.id, d.name, d.email, d.weekly_reminder_email')) {
            return {
                rows: [{
                    id: 7,
                    name: 'Embotellado',
                    email: 'area@example.com',
                    weekly_reminder_email: 'semana@example.com',
                    weekly_reminder_last_sent_date: null,
                    location_name: 'Cariñena',
                    loc_email: 'sede@example.com',
                }],
            };
        }

        if (sql.startsWith('SELECT mp.id, mp.task_description, mp.next_due_date, a.name AS asset_name')) {
            assert.equal(params[0], 7);
            assert.equal(params[1], '2026-04-12');
            return {
                rows: [{
                    id: 15,
                    task_description: 'Revision semanal',
                    next_due_date: '2026-04-08',
                    asset_name: 'Llenadora 1',
                }],
            };
        }

        if (sql.startsWith('SELECT l.id, l.created_at, l.global_comment, l.failure_cause, l.solution, l.follow_up_notes, a.name AS asset_name')) {
            assert.equal(params[0], 7);
            return {
                rows: [
                    {
                        id: 31,
                        created_at: '2026-04-01T08:00:00Z',
                        failure_cause: 'Motor parado',
                        solution: '',
                        follow_up_notes: '',
                        asset_name: 'Llenadora 1',
                        task_description: 'Averia general',
                    },
                    {
                        id: 32,
                        created_at: '2026-04-02T09:00:00Z',
                        failure_cause: 'Se detecta holgura',
                        solution: 'Ajuste provisional',
                        follow_up_notes: 'Revisar vibracion el viernes',
                        asset_name: 'Etiquetadora 2',
                        task_description: 'Correccion puntual',
                    },
                ],
            };
        }

        if (sql === 'UPDATE departments SET weekly_reminder_last_sent_date = $1 WHERE id = $2') {
            assert.equal(params[0], '2026-04-06');
            assert.equal(params[1], 7);
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    try {
        const sentCount = await AlertController.__testables.sendWeeklyDepartmentReminders(
            client,
            new Date('2026-04-06T09:00:00Z')
        );

        assert.equal(sentCount, 1);
        assert.equal(sentEmails.length, 1);
        assert.equal(sentEmails[0].to, 'semana@example.com');
        assert.match(sentEmails[0].text, /Revision semanal/);
        assert.match(sentEmails[0].text, /Semana: 2026-04-06 a 2026-04-12/);
        assert.match(sentEmails[0].text, /Correctivos abiertos:/);
        assert.match(sentEmails[0].text, /Motor parado/);
        assert.match(sentEmails[0].text, /Correctivos en seguimiento:/);
        assert.match(sentEmails[0].text, /Ajuste provisional/);
    } finally {
        emailService.sendEmail = originalSendEmail;
        delete require.cache[controllerPath];
        require('../controllers/AlertController');
    }
});

test('sendWeeklyDepartmentReminders envia correo aunque no haya preventivos si existen correctivos abiertos', async () => {
    const emailService = require('../services/emailService');
    const originalSendEmail = emailService.sendEmail;
    const controllerPath = require.resolve('../controllers/AlertController');
    delete require.cache[controllerPath];

    const sentEmails = [];
    emailService.sendEmail = async (payload) => {
        sentEmails.push(payload);
        return true;
    };

    const AlertController = require('../controllers/AlertController');

    const client = createFakeClient(async (sql, params) => {
        if (sql.startsWith('SELECT d.id, d.name, d.email, d.weekly_reminder_email')) {
            return {
                rows: [{
                    id: 9,
                    name: 'Bodega',
                    email: 'bodega@example.com',
                    weekly_reminder_email: null,
                    weekly_reminder_last_sent_date: null,
                    location_name: 'Cariñena',
                    loc_email: 'sede@example.com',
                }],
            };
        }

        if (sql.startsWith('SELECT mp.id, mp.task_description, mp.next_due_date, a.name AS asset_name')) {
            return { rows: [] };
        }

        if (sql.startsWith('SELECT l.id, l.created_at, l.global_comment, l.failure_cause, l.solution, l.follow_up_notes, a.name AS asset_name')) {
            assert.equal(params[0], 9);
            return {
                rows: [{
                    id: 41,
                    created_at: '2026-04-05T10:30:00Z',
                    failure_cause: 'Fuga en valvula',
                    solution: '',
                    follow_up_notes: '',
                    asset_name: 'Compresor 3',
                    task_description: 'Averia general',
                }],
            };
        }

        if (sql === 'UPDATE departments SET weekly_reminder_last_sent_date = $1 WHERE id = $2') {
            return { rows: [] };
        }

        throw new Error(`Unexpected query: ${sql}`);
    });

    try {
        const sentCount = await AlertController.__testables.sendWeeklyDepartmentReminders(
            client,
            new Date('2026-04-06T09:00:00Z')
        );

        assert.equal(sentCount, 1);
        assert.equal(sentEmails.length, 1);
        assert.match(sentEmails[0].text, /Correctivos abiertos:/);
        assert.match(sentEmails[0].text, /Compresor 3/);
        assert.doesNotMatch(sentEmails[0].text, /Tareas pendientes o previstas:/);
    } finally {
        emailService.sendEmail = originalSendEmail;
        delete require.cache[controllerPath];
        require('../controllers/AlertController');
    }
});
