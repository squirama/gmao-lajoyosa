function calculateNextPlanDate(plan) {
    if (!plan.frequency_days || plan.frequency_days <= 0) {
        return null;
    }

    let nextDate = new Date();

    if (plan.force_dow && plan.start_date && plan.next_due_date) {
        const startDate = new Date(plan.start_date);
        const currentDue = new Date(plan.next_due_date);
        const freq = plan.frequency_days;
        const diffDays = (currentDue - startDate) / (1000 * 60 * 60 * 24);
        const cycles = Math.round(diffDays / freq);

        const gridDate = new Date(startDate);
        gridDate.setDate(gridDate.getDate() + (cycles * freq));

        nextDate = new Date(gridDate);
        nextDate.setDate(nextDate.getDate() + freq);
        return nextDate;
    }

    if (plan.start_date && plan.next_due_date) {
        nextDate = new Date(plan.next_due_date);
        nextDate.setDate(nextDate.getDate() + plan.frequency_days);
        return nextDate;
    }

    nextDate.setDate(nextDate.getDate() + plan.frequency_days);
    return nextDate;
}

function calculateSkippedPlanDate(plan) {
    if (!plan.frequency_days || plan.frequency_days <= 0) {
        throw new Error('Cannot skip a non-recurring task');
    }

    const currentDue = plan.next_due_date ? new Date(plan.next_due_date) : new Date();
    let newDate = new Date(currentDue);

    if (plan.force_dow && plan.start_date) {
        const startDate = new Date(plan.start_date);
        const freq = plan.frequency_days;
        const diffDays = (currentDue - startDate) / (1000 * 60 * 60 * 24);
        const cycles = Math.round(diffDays / freq);

        const gridDate = new Date(startDate);
        gridDate.setDate(gridDate.getDate() + (cycles * freq));

        newDate = new Date(gridDate);
        newDate.setDate(newDate.getDate() + freq);
        return newDate;
    }

    newDate.setDate(newDate.getDate() + plan.frequency_days);
    return newDate;
}

function normalizePlanPayload(body) {
    const initialDate = body.start_date ? new Date(body.start_date) : new Date();
    const isNonRecurring = !body.frequency_days || body.frequency_days <= 0;

    return {
        assetId: body.asset_id,
        taskDescription: body.task_description,
        frequencyDays: isNonRecurring ? 0 : body.frequency_days,
        notifyExternal: body.notify_external || false,
        nextDueDate: isNonRecurring ? null : initialDate,
        startDate: initialDate,
        notificationEmail: body.notification_email || null,
        isLegal: body.is_legal || false,
        forceDow: body.force_dow || false,
    };
}

async function clearPlanRuntimeState(client, planId, currentDueDate) {
    await client.query('DELETE FROM pending_alerts WHERE plan_id = $1', [planId]);

    if (currentDueDate) {
        await client.query(
            'DELETE FROM plan_exceptions WHERE plan_id = $1 AND original_date <= $2',
            [planId, currentDueDate]
        );
    }
}

module.exports = {
    calculateNextPlanDate,
    calculateSkippedPlanDate,
    clearPlanRuntimeState,
    normalizePlanPayload,
};
