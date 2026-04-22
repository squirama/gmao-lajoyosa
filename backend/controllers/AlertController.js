const db = require('../db');
const { sendEmail } = require('../services/emailService');
const { countMissedOccurrences, formatDateOnly } = require('../services/planService');

function buildWeekRange(referenceDate = new Date()) {
    const day = referenceDate.getDay();
    const mondayOffset = day === 0 ? -6 : 1 - day;
    const monday = new Date(referenceDate);
    monday.setHours(0, 0, 0, 0);
    monday.setDate(monday.getDate() + mondayOffset);

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);

    return { monday, sunday };
}

function buildWeeklyPlanLines(plans, mondayStr) {
    return plans.map((plan) => {
        const dueDate = formatDateOnly(plan.next_due_date);
        const prefix = dueDate < mondayStr ? '[VENCIDA]' : `[${dueDate}]`;
        return `${prefix} ${plan.asset_name} - ${plan.task_description}`;
    });
}

function buildCorrectiveReminderSections(rows) {
    const openItems = [];
    const followUpItems = [];

    for (const row of rows) {
        const createdAt = formatDateOnly(row.created_at);
        const baseLine = `[${createdAt}] ${row.asset_name} - ${row.task_description}`;
        const comment = String(row.failure_cause || row.global_comment || '').trim();
        const solution = String(row.solution || '').trim();
        const followUpNotes = String(row.follow_up_notes || '').trim();

        if (!solution && !followUpNotes) {
            openItems.push(comment ? `${baseLine} | ${comment}` : baseLine);
            continue;
        }

        const detailParts = [];
        if (comment) detailParts.push(`Aviso: ${comment}`);
        if (solution) detailParts.push(`Solucion: ${solution}`);
        if (followUpNotes) detailParts.push(`Seguimiento: ${followUpNotes}`);
        followUpItems.push(detailParts.length > 0 ? `${baseLine} | ${detailParts.join(' | ')}` : baseLine);
    }

    return { openItems, followUpItems };
}

async function sendWeeklyDepartmentReminders(client, referenceDate = new Date()) {
    if (referenceDate.getDay() !== 1) {
        return 0;
    }

    const { monday, sunday } = buildWeekRange(referenceDate);
    const mondayStr = formatDateOnly(monday);
    const sundayStr = formatDateOnly(sunday);
    const departmentsRes = await client.query(`
        SELECT
            d.id,
            d.name,
            d.email,
            d.weekly_reminder_email,
            d.weekly_reminder_last_sent_date,
            l.name AS location_name,
            l.email AS loc_email
        FROM departments d
        JOIN locations l ON d.location_id = l.id
        WHERE d.weekly_reminder_enabled = true
        ORDER BY l.name, d.name
    `);

    let sentCount = 0;

    for (const department of departmentsRes.rows) {
        if (formatDateOnly(department.weekly_reminder_last_sent_date) === mondayStr) {
            continue;
        }

        const recipient = department.weekly_reminder_email || department.email || department.loc_email || process.env.NOTIFICATION_EMAIL;
        if (!recipient) {
            continue;
        }

        const plansRes = await client.query(
            `SELECT
                mp.id,
                mp.task_description,
                mp.next_due_date,
                a.name AS asset_name
             FROM maintenance_plans mp
             JOIN assets a ON mp.asset_id = a.id
             WHERE mp.active = true
               AND a.dept_id = $1
               AND mp.next_due_date IS NOT NULL
               AND mp.next_due_date <= $2
             ORDER BY mp.next_due_date ASC, a.name ASC`,
            [department.id, sundayStr]
        );

        const correctivesRes = await client.query(
            `SELECT
                l.id,
                l.created_at,
                l.global_comment,
                l.failure_cause,
                l.solution,
                l.follow_up_notes,
                a.name AS asset_name,
                COALESCE(NULLIF(STRING_AGG(DISTINCT it.description, ' | '), ''), 'Averia / Correctivo') AS task_description
             FROM intervention_logs l
             JOIN assets a ON l.asset_id = a.id
             LEFT JOIN intervention_tasks it ON it.intervention_id = l.id
             WHERE a.dept_id = $1
               AND l.follow_up_required = true
               AND l.follow_up_status = 'OPEN'
             GROUP BY l.id, l.created_at, l.global_comment, l.failure_cause, l.solution, l.follow_up_notes, a.name
             ORDER BY l.created_at DESC, a.name ASC`,
            [department.id]
        );

        const planLines = buildWeeklyPlanLines(plansRes.rows, mondayStr);
        const { openItems, followUpItems } = buildCorrectiveReminderSections(correctivesRes.rows);

        if (planLines.length === 0 && openItems.length === 0 && followUpItems.length === 0) {
            continue;
        }

        const sections = [
            `Area: ${department.name}`,
            `Sede: ${department.location_name}`,
            `Semana: ${mondayStr} a ${sundayStr}`,
        ];

        if (planLines.length > 0) {
            sections.push('', 'Tareas pendientes o previstas:', ...planLines);
        }

        if (openItems.length > 0) {
            sections.push('', 'Correctivos abiertos:', ...openItems);
        }

        if (followUpItems.length > 0) {
            sections.push('', 'Correctivos en seguimiento:', ...followUpItems);
        }

        await sendAlertEmail(
            `Recordatorio semanal de mantenimiento - ${department.name}`,
            sections.join('\n'),
            recipient
        );

        await client.query(
            'UPDATE departments SET weekly_reminder_last_sent_date = $1 WHERE id = $2',
            [mondayStr, department.id]
        );
        sentCount += 1;
    }

    return sentCount;
}

// Helper
async function sendAlertEmail(subject, text, recipient) {
    return sendEmail({
        subject,
        text,
        to: recipient,
        senderName: 'GMAO Alert',
    });
}

exports.postponeAlert = async (req, reply) => {
    const { alert_id, new_date, user_id, reason } = req.body;
    const today = new Date().toISOString().split('T')[0];
    if (new_date < today) return reply.code(400).send({ error: "❌ Cannot postpone to past." });

    const client = await db.connect();
    try {
        await client.query('BEGIN');
        const res = await client.query(
            `UPDATE pending_alerts SET scheduled_date = $1, postpone_count = postpone_count + 1 WHERE id = $2 RETURNING *`,
            [new_date, alert_id]
        );
        if (res.rowCount === 0) { await client.query('ROLLBACK'); return reply.code(404).send({ error: "Not found" }); }

        const alert = res.rows[0];

        await client.query(
            `INSERT INTO postponement_history (alert_id, previous_date, new_date, user_id, reason) 
             VALUES ($1, (SELECT scheduled_date FROM pending_alerts WHERE id = $1), $2, $3, $4)`,
            [alert_id, new_date, user_id, reason]
        );

        if (alert.postpone_count >= 3 && !alert.email_sent) {
            await sendAlertEmail(`⚠️ ALERTA CRÍTICA: Tarea Pospuesta 3 Veces (ID: ${alert_id})`,
                `La tarea #${alert.plan_id} (Alerta #${alert_id}) se ha pospuesto 3 veces.\nNueva Fecha: ${new_date}\nMotivo: ${reason}`);
            await client.query(`UPDATE pending_alerts SET email_sent = true WHERE id = $1`, [alert_id]);
        }
        await client.query('COMMIT');
        return { success: true, postpone_count: alert.postpone_count };
    } catch (e) {
        await client.query('ROLLBACK');
        reply.code(500).send({ error: e.message });
    } finally { client.release(); }
};

exports.getPendingAlerts = async (req, reply) => {
    const { dept_id, location_id } = req.query;
    let query = `
        SELECT pa.*, a.name as asset_name, mp.task_description, d.name as dept_name
        FROM pending_alerts pa
        JOIN maintenance_plans mp ON pa.plan_id = mp.id
        JOIN assets a ON pa.asset_id = a.id
        JOIN departments d ON a.dept_id = d.id
        WHERE pa.scheduled_date <= NOW()
    `;
    const params = [];
    if (dept_id) { params.push(dept_id); query += ` AND a.dept_id = $${params.length}`; }
    query += " ORDER BY pa.scheduled_date ASC";
    const res = await db.query(query, params);
    return res.rows;
};

exports.generateAlerts = async (req, reply) => {
    const client = await db.connect();
    try {
        await client.query('BEGIN');
        // V3.2: Use next_due_date (now a Date column)
        // 1. Generate Alerts
        const res = await client.query(`
            INSERT INTO pending_alerts (plan_id, asset_id, scheduled_date)
            SELECT id, asset_id, next_due_date
            FROM maintenance_plans
            WHERE next_due_date <= (CURRENT_DATE + (COALESCE(notification_lead_days, 0) * INTERVAL '1 day'))
            ON CONFLICT (plan_id, scheduled_date) DO NOTHING
        `);

        // 2. Send Emails for Pending Alerts with notify_external
        const pending = await client.query(`
            SELECT pa.id, mp.task_description, mp.notification_email as plan_email,
                   a.name as asset_name, d.email as dept_email, l.email as loc_email
            FROM pending_alerts pa
            JOIN maintenance_plans mp ON pa.plan_id = mp.id
            JOIN assets a ON pa.asset_id = a.id
            JOIN departments d ON a.dept_id = d.id
            JOIN locations l ON d.location_id = l.id
            WHERE pa.email_sent = false AND mp.notify_external = true
        `);

        for (const alert of pending.rows) {
            // HIERARCHY: Plan > Dept > Loc > Global
            const recipient = alert.plan_email || alert.dept_email || alert.loc_email || process.env.NOTIFICATION_EMAIL;

            if (recipient) {
                await sendAlertEmail(
                    `🔔 MANTENIMIENTO: ${alert.asset_name}`,
                    `Tarea Pendiente: ${alert.task_description}\nActivo: ${alert.asset_name}\nFecha: HOY`,
                    recipient // Pass recipient explicitly
                );
            }
            await client.query(`UPDATE pending_alerts SET email_sent = true WHERE id = $1`, [alert.id]);
        }

        const overduePlans = await client.query(`
            SELECT
                mp.id,
                mp.asset_id,
                mp.task_description,
                mp.next_due_date,
                mp.frequency_days,
                mp.missed_threshold_email_sent_at,
                mp.notification_email AS plan_email,
                a.name AS asset_name,
                d.email AS dept_email,
                l.email AS loc_email
            FROM maintenance_plans mp
            JOIN assets a ON mp.asset_id = a.id
            JOIN departments d ON a.dept_id = d.id
            JOIN locations l ON d.location_id = l.id
            WHERE mp.active = true
              AND mp.next_due_date IS NOT NULL
              AND mp.next_due_date <= CURRENT_DATE
        `);

        for (const plan of overduePlans.rows) {
            const completedRes = await client.query(
                `SELECT scheduled_date
                 FROM maintenance_history
                 WHERE plan_id = $1 AND scheduled_date IS NOT NULL`,
                [plan.id]
            );
            const missedCount = countMissedOccurrences(
                plan,
                completedRes.rows.map((row) => row.scheduled_date),
                new Date()
            );

            if (missedCount > 3 && !plan.missed_threshold_email_sent_at) {
                const recipient = plan.plan_email || plan.dept_email || plan.loc_email || process.env.NOTIFICATION_EMAIL;
                if (recipient) {
                    await sendAlertEmail(
                        `ALERTA CRITICA: ${plan.asset_name} acumula ${missedCount} mantenimientos sin hacer`,
                        `Plan: ${plan.task_description}\nActivo: ${plan.asset_name}\nPrimer vencimiento pendiente: ${formatDateOnly(plan.next_due_date)}\nIncumplimientos acumulados: ${missedCount}`,
                        recipient
                    );
                }
                await client.query(
                    'UPDATE maintenance_plans SET missed_threshold_email_sent_at = NOW() WHERE id = $1',
                    [plan.id]
                );
                continue;
            }

            if (missedCount <= 3 && plan.missed_threshold_email_sent_at) {
                await client.query(
                    'UPDATE maintenance_plans SET missed_threshold_email_sent_at = NULL WHERE id = $1',
                    [plan.id]
                );
            }
        }

        const weeklyRemindersSent = await sendWeeklyDepartmentReminders(client, new Date());

        await client.query('COMMIT');
        return {
            generated: res.rowCount,
            emails_sent: pending.rows.length,
            weekly_reminders_sent: weeklyRemindersSent,
        };
    } catch (e) {
        await client.query('ROLLBACK');
        return reply.code(500).send({ error: e.message });
    } finally { client.release(); }
};

exports.__testables = {
    buildCorrectiveReminderSections,
    buildWeekRange,
    buildWeeklyPlanLines,
    sendWeeklyDepartmentReminders,
};
