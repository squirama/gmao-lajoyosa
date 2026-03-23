const {
    ensureBoolean,
    ensureDateOnlyString,
    ensureEmail,
    ensureNonNegativeInteger,
    ensurePositiveInteger,
    ensureString,
} = require('../utils/validation');

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
    const assetId = ensurePositiveInteger(body.asset_id, 'asset_id');
    const taskDescription = ensureString(body.task_description, 'task_description', { maxLength: 255 });
    const frequencyDays = ensureNonNegativeInteger(body.frequency_days, 'frequency_days', {
        required: false,
        defaultValue: 0,
    });
    const startDateValue = ensureDateOnlyString(body.start_date, 'start_date', { required: false });
    const initialDate = startDateValue ? new Date(`${startDateValue}T00:00:00Z`) : new Date();
    const isNonRecurring = !frequencyDays || frequencyDays <= 0;

    return {
        assetId,
        taskDescription,
        frequencyDays: isNonRecurring ? 0 : frequencyDays,
        notifyExternal: ensureBoolean(body.notify_external, 'notify_external', { defaultValue: false }),
        nextDueDate: isNonRecurring ? null : initialDate,
        startDate: initialDate,
        notificationEmail: ensureEmail(body.notification_email, 'notification_email', { required: false }),
        isLegal: ensureBoolean(body.is_legal, 'is_legal', { defaultValue: false }),
        forceDow: ensureBoolean(body.force_dow, 'force_dow', { defaultValue: false }),
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
