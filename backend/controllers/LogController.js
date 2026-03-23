const db = require('../db');
const nodemailer = require('nodemailer');
const { processPartConsumptions } = require('../utils/inventory_helper');

exports.createLog = async (req, reply) => {
    const { asset_id, user_id, global_comment, tasks, solution, consumed_parts } = req.body;
    const client = await db.connect();

    try {
        await client.query('BEGIN');

        // A. Insert Log Header
        const logRes = await client.query(
            `INSERT INTO intervention_logs (asset_id, user_id, global_comment, duration_minutes, solution) VALUES ($1, $2, $3, $4, $5) RETURNING id`,
            [asset_id, user_id, global_comment, req.body.duration_minutes || 0, solution || null]
        );
        const logId = logRes.rows[0].id;

        // B. Insert Tasks
        const alertTasks = [];
        const activeTasks = (tasks || []).filter(t => t.checked);

        for (const task of activeTasks) {
            await client.query(
                `INSERT INTO intervention_tasks (intervention_id, description, status, comments, alert_manager)
                 VALUES ($1, $2, $3, $4, $5)`,
                [logId, task.description, 'DONE', task.comment, task.alert]
            );

            // Close Preventive Alert if applicable
            if (task.plan_id) {
                // Delete pending alert
                await client.query(`DELETE FROM pending_alerts WHERE plan_id = $1`, [task.plan_id]);

                // Update maintenance_plan last_performed
                // And CALCULATE NEXT DUE DATE (Since it's no longer generated)
                // Logic: New Next Due = Today + Frequency
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

        // C. Process Spare Parts consumptions
        if (consumed_parts && consumed_parts.length > 0) {
            await processPartConsumptions(client, consumed_parts, { intervention_id: logId });
        }

        await client.query('COMMIT');

        // C. Email Notification
        const notifyEmail = process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;

        if (alertTasks.length > 0) {
            // Fetch Operator Name
            const userRes = await client.query('SELECT full_name FROM users WHERE id = $1', [user_id]);
            const operator_name = userRes.rows.length > 0 ? userRes.rows[0].full_name : 'Desconocido';

            // --- HIERARCHICAL EMAIL LOGIC ---
            // 1. Get Asset's Dept Email & Loc Email
            const emailRes = await client.query(`
                SELECT d.email as dept_email, l.email as loc_email
                FROM assets a
                JOIN departments d ON a.dept_id = d.id
                JOIN locations l ON d.location_id = l.id
                WHERE a.id = $1
            `, [asset_id]);

            let targetEmail = process.env.NOTIFICATION_EMAIL || process.env.SMTP_USER;

            if (emailRes.rows.length > 0) {
                const { dept_email, loc_email } = emailRes.rows[0];
                if (dept_email) targetEmail = dept_email;       // 2. Department Priority
                else if (loc_email) targetEmail = loc_email;    // 3. Location Priority
            }

            const taskListHTML = alertTasks.map(t => `<li><strong>${t.description}</strong>: ${t.comment || 'N/A'}</li>`).join('');

            // Re-use robust transporter config
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'smtp.example.com',
                port: process.env.SMTP_PORT || 465,
                secure: true,
                auth: {
                    user: process.env.SMTP_USER || 'alerts@example.com',
                    pass: process.env.SMTP_PASS
                }
            });

            try {
                await transporter.sendMail({
                    from: '"GMAO Alert" <' + (process.env.SMTP_USER || 'alerts@example.com') + '>',
                    to: targetEmail,
                    subject: `🚨 ALERTA - Activo #${asset_id}`,
                    html: `
                        <h3>Incidencia Reportada</h3>
                        <p><strong>Operario:</strong> ${operator_name} (ID: ${user_id})</p>
                        <p><strong>Duración:</strong> ${req.body.duration_minutes || 0} min</p>
                        <ul>${taskListHTML}</ul>
                        <hr>
                        <p><strong>Problema / Comentario Global:</strong><br>${global_comment || 'Sin comentarios'}</p>
                        <p><strong>Solución Aplicada:</strong><br>${solution || 'No registrada'}</p>
                    `
                });
                console.log('✅ Alert email sent to ' + targetEmail);
            } catch (emailErr) {
                console.error('❌ Alert email failed:', emailErr);
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
