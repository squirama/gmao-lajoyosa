const db = require('../db');
const { sendEmail } = require('../services/emailService');
const { processPartConsumptions } = require('../utils/inventory_helper');

exports.createLog = async (req, reply) => {
    const { asset_id, user_id, global_comment, tasks, solution, consumed_parts, document_path } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        const logRes = await client.query(
            `INSERT INTO intervention_logs (asset_id, user_id, global_comment, duration_minutes, solution, document_path) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
            [asset_id, user_id, global_comment, req.body.duration_minutes || 0, solution || null, document_path || null]
        );
        const logId = logRes.rows[0].id;

        const alertTasks = [];
        const activeTasks = (tasks || []).filter((task) => task.checked);

        for (const task of activeTasks) {
            await client.query(
                `INSERT INTO intervention_tasks (intervention_id, description, status, comments, alert_manager)
                 VALUES ($1, $2, $3, $4, $5)`,
                [logId, task.description, 'DONE', task.comment, task.alert]
            );

            if (task.plan_id) {
                await client.query(`DELETE FROM pending_alerts WHERE plan_id = $1`, [task.plan_id]);
                await client.query(
                    `UPDATE maintenance_plans 
                     SET last_performed = CURRENT_DATE,
                         next_due_date = CURRENT_DATE + make_interval(days => frequency_days)
                     WHERE id = $1`,
                    [task.plan_id]
                );
            }

            if (task.alert) alertTasks.push(task);
        }

        if (consumed_parts && consumed_parts.length > 0) {
            await processPartConsumptions(client, consumed_parts, { intervention_id: logId });
        }

        await client.query('COMMIT');

        const notifyEmail = process.env.NOTIFICATION_EMAIL || 'mantenimiento@bodegascare.com';
        const hasGlobalComment = Boolean(global_comment && String(global_comment).trim());
        const hasSolution = Boolean(solution && String(solution).trim());
        const shouldNotify = alertTasks.length > 0 || hasGlobalComment || hasSolution;

        if (shouldNotify) {
            const userRes = await client.query('SELECT full_name FROM users WHERE id = $1', [user_id]);
            const operatorName = userRes.rows.length > 0 ? userRes.rows[0].full_name : 'Desconocido';

            const emailRes = await client.query(
                `
                SELECT d.email as dept_email, l.email as loc_email
                FROM assets a
                JOIN departments d ON a.dept_id = d.id
                JOIN locations l ON d.location_id = l.id
                WHERE a.id = $1
            `,
                [asset_id]
            );

            let targetEmail = notifyEmail;
            if (emailRes.rows.length > 0) {
                const { dept_email: deptEmail, loc_email: locEmail } = emailRes.rows[0];
                if (deptEmail) targetEmail = deptEmail;
                else if (locEmail) targetEmail = locEmail;
            }

            const taskListHtml = alertTasks.length > 0
                ? `<ul>${alertTasks.map((task) => `<li><strong>${task.description}</strong>: ${task.comment || 'N/A'}</li>`).join('')}</ul>`
                : '<p>Sin tareas marcadas con campana.</p>';

            try {
                await sendEmail({
                    senderName: 'GMAO Alert',
                    to: targetEmail,
                    fallbackRecipient: notifyEmail,
                    subject: `ALERTA - Activo #${asset_id}`,
                    html: `
                        <h3>Incidencia Reportada</h3>
                        <p><strong>Operario:</strong> ${operatorName} (ID: ${user_id})</p>
                        <p><strong>Duracion:</strong> ${req.body.duration_minutes || 0} min</p>
                        ${taskListHtml}
                        <hr>
                        <p><strong>Problema / Comentario Global:</strong><br>${global_comment || 'Sin comentarios'}</p>
                        <p><strong>Solucion aplicada:</strong><br>${solution || 'No registrada'}</p>
                    `,
                });
                console.log(`Alert email sent to ${targetEmail}`);
            } catch (emailErr) {
                console.error('Alert email failed:', emailErr);
            }
        }

        return { success: true, id: logId };
    } catch (e) {
        await client.query('ROLLBACK');
        reply.code(500).send({ error: e.message });
    } finally {
        client.release();
    }
};
