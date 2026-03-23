async function insertPlan(client, plan) {
    const res = await client.query(
        `INSERT INTO maintenance_plans (
            asset_id,
            task_description,
            frequency_days,
            notify_external,
            next_due_date,
            start_date,
            notification_email,
            is_legal,
            force_dow
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *`,
        [
            plan.assetId,
            plan.taskDescription,
            plan.frequencyDays,
            plan.notifyExternal,
            plan.nextDueDate,
            plan.startDate,
            plan.notificationEmail,
            plan.isLegal,
            plan.forceDow,
        ]
    );
    return res.rows[0];
}

async function updatePlan(client, planId, plan) {
    const res = await client.query(
        `UPDATE maintenance_plans
         SET asset_id = $1,
             task_description = $2,
             frequency_days = $3,
             notify_external = $4,
             notification_email = $5,
             is_legal = $6,
             force_dow = $7,
             next_due_date = CASE WHEN $3 <= 0 THEN NULL ELSE next_due_date END
         WHERE id = $8
         RETURNING *`,
        [
            plan.assetId,
            plan.taskDescription,
            plan.frequencyDays,
            plan.notifyExternal,
            plan.notificationEmail,
            plan.isLegal,
            plan.forceDow,
            planId,
        ]
    );
    return res.rows[0];
}

async function deactivatePlan(client, planId) {
    await client.query('UPDATE maintenance_plans SET active = false WHERE id = $1', [planId]);
}

async function getPlanById(client, planId) {
    const res = await client.query('SELECT * FROM maintenance_plans WHERE id = $1', [planId]);
    return res.rows[0] || null;
}

async function getPlanWithAssetName(client, planId) {
    const res = await client.query(
        `SELECT p.*, a.name as asset_name
         FROM maintenance_plans p
         JOIN assets a ON p.asset_id = a.id
         WHERE p.id = $1`,
        [planId]
    );
    return res.rows[0] || null;
}

async function updatePlanDueDate(client, planId, nextDueDate) {
    await client.query(
        'UPDATE maintenance_plans SET next_due_date = $1 WHERE id = $2',
        [nextDueDate, planId]
    );
}

async function updatePlanCompletion(client, planId, nextDueDate) {
    await client.query(
        'UPDATE maintenance_plans SET next_due_date = $1, last_performed = CURRENT_DATE WHERE id = $2',
        [nextDueDate, planId]
    );
}

async function deletePendingAlertsByPlanId(client, planId) {
    await client.query('DELETE FROM pending_alerts WHERE plan_id = $1', [planId]);
}

async function updatePendingAlertsSchedule(client, planId, scheduledDate) {
    await client.query(
        'UPDATE pending_alerts SET scheduled_date = $1 WHERE plan_id = $2',
        [scheduledDate, planId]
    );
}

async function upsertPlanException(client, planId, originalDate, newDate) {
    const existing = await client.query(
        'SELECT id FROM plan_exceptions WHERE plan_id = $1 AND original_date = $2',
        [planId, originalDate]
    );

    if (existing.rows.length > 0) {
        await client.query(
            'UPDATE plan_exceptions SET new_date = $1 WHERE id = $2',
            [newDate, existing.rows[0].id]
        );
        return;
    }

    await client.query(
        'INSERT INTO plan_exceptions (plan_id, original_date, new_date) VALUES ($1, $2, $3)',
        [planId, originalDate, newDate]
    );
}

async function insertHistory(client, history) {
    const res = await client.query(
        `INSERT INTO maintenance_history (
            plan_id,
            asset_id,
            operator_id,
            performed_date,
            notes,
            document_path
        )
        VALUES ($1, $2, $3, CURRENT_DATE, $4, $5)
        RETURNING id`,
        [
            history.planId,
            history.assetId,
            history.operatorId,
            history.notes,
            history.documentPath,
        ]
    );
    return res.rows[0].id;
}

async function getUserFullName(client, userId) {
    const res = await client.query('SELECT full_name FROM users WHERE id = $1', [userId]);
    return res.rows[0]?.full_name || null;
}

async function getPlanHistory(client, planId) {
    const res = await client.query(
        `SELECT h.*, u.full_name as operator_name
         FROM maintenance_history h
         LEFT JOIN users u ON h.operator_id = u.id
         WHERE h.plan_id = $1
         ORDER BY h.performed_date DESC`,
        [planId]
    );
    return res.rows;
}

module.exports = {
    deactivatePlan,
    deletePendingAlertsByPlanId,
    getPlanById,
    getPlanHistory,
    getPlanWithAssetName,
    getUserFullName,
    insertHistory,
    insertPlan,
    updatePendingAlertsSchedule,
    updatePlan,
    updatePlanCompletion,
    updatePlanDueDate,
    upsertPlanException,
};
