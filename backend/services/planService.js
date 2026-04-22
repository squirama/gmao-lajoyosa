const {
    ensureBoolean,
    ensureDateOnlyString,
    ensureEmail,
    ensureNonNegativeInteger,
    ensurePositiveInteger,
    ensureString,
} = require('../utils/validation');

function parseDateOnly(value) {
    if (!value) return null;
    if (value instanceof Date) {
        const date = new Date(value);
        date.setHours(0, 0, 0, 0);
        return date;
    }

    const raw = String(value).slice(0, 10);
    const [year, month, day] = raw.split('-').map(Number);
    if (!year || !month || !day) return null;
    return new Date(year, month - 1, day);
}

function formatDateOnly(value) {
    const date = parseDateOnly(value);
    if (!date) return null;
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function addDays(dateValue, days) {
    const date = parseDateOnly(dateValue);
    date.setDate(date.getDate() + days);
    return date;
}

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

function resolveScheduledDateToComplete(plan, { performedDate = new Date(), completedScheduledDates = [] } = {}) {
    const currentDue = parseDateOnly(plan.next_due_date);
    if (!currentDue) return null;

    const performedDay = parseDateOnly(performedDate);
    const completedSet = new Set(
        completedScheduledDates
            .map((value) => formatDateOnly(value))
            .filter(Boolean)
    );

    if (!plan.frequency_days || plan.frequency_days <= 0 || performedDay < currentDue) {
        return currentDue;
    }

    let selected = currentDue;
    let cursor = currentDue;
    const frequency = Number(plan.frequency_days) || 0;

    for (let i = 0; i < 366; i += 1) {
        const cursorStr = formatDateOnly(cursor);
        if (cursor > performedDay) {
            break;
        }

        if (!completedSet.has(cursorStr)) {
            selected = new Date(cursor);
        }

        cursor = addDays(cursor, frequency);
    }

    return selected;
}

function calculateNextUnresolvedDueDate(plan, completedScheduledDates = []) {
    const currentDue = parseDateOnly(plan.next_due_date);
    if (!currentDue) return null;

    const completedSet = new Set(
        completedScheduledDates
            .map((value) => formatDateOnly(value))
            .filter(Boolean)
    );

    const currentDueStr = formatDateOnly(currentDue);
    if (!completedSet.has(currentDueStr)) {
        return currentDue;
    }

    if (!plan.frequency_days || plan.frequency_days <= 0) {
        return null;
    }

    let cursor = currentDue;
    const frequency = Number(plan.frequency_days) || 0;
    for (let i = 0; i < 366; i += 1) {
        cursor = addDays(cursor, frequency);
        const cursorStr = formatDateOnly(cursor);
        if (!completedSet.has(cursorStr)) {
            return cursor;
        }
    }

    return cursor;
}

function countMissedOccurrences(plan, completedScheduledDates = [], referenceDate = new Date()) {
    const currentDue = parseDateOnly(plan.next_due_date);
    if (!currentDue) return 0;

    const refDay = parseDateOnly(referenceDate);
    if (currentDue > refDay) return 0;

    const completedSet = new Set(
        completedScheduledDates
            .map((value) => formatDateOnly(value))
            .filter(Boolean)
    );

    if (!plan.frequency_days || plan.frequency_days <= 0) {
        return completedSet.has(formatDateOnly(currentDue)) ? 0 : 1;
    }

    let missedCount = 0;
    let cursor = currentDue;
    const frequency = Number(plan.frequency_days) || 0;

    for (let i = 0; i < 366; i += 1) {
        if (cursor > refDay) break;
        const cursorStr = formatDateOnly(cursor);
        if (!completedSet.has(cursorStr)) {
            missedCount += 1;
        }
        cursor = addDays(cursor, frequency);
    }

    return missedCount;
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
    const rawNotificationEmail = body.notification_email;

    return {
        assetId,
        taskDescription,
        frequencyDays: isNonRecurring ? 0 : frequencyDays,
        notifyExternal: ensureBoolean(body.notify_external, 'notify_external', { defaultValue: false }),
        nextDueDate: isNonRecurring ? null : initialDate,
        startDate: initialDate,
        notificationEmail: rawNotificationEmail === '' || rawNotificationEmail === undefined || rawNotificationEmail === null
            ? null
            : ensureEmail(rawNotificationEmail, 'notification_email', { required: false }),
        isLegal: ensureBoolean(body.is_legal, 'is_legal', { defaultValue: false }),
        forceDow: ensureBoolean(body.force_dow, 'force_dow', { defaultValue: false }),
        isDocumentary: ensureBoolean(body.is_documentary, 'is_documentary', { defaultValue: false }),
        documentSteps: Array.isArray(body.document_steps) ? body.document_steps : [],
    };
}

async function clearPlanRuntimeState(client, planId, currentDueDate) {
    if (!currentDueDate) {
        await client.query('DELETE FROM pending_alerts WHERE plan_id = $1', [planId]);
        return;
    }

    await client.query(
        'DELETE FROM pending_alerts WHERE plan_id = $1 AND scheduled_date = $2',
        [planId, currentDueDate]
    );

    if (currentDueDate) {
        await client.query(
            'DELETE FROM plan_exceptions WHERE plan_id = $1 AND (original_date = $2 OR new_date = $2)',
            [planId, currentDueDate]
        );
    }
}

module.exports = {
    calculateNextUnresolvedDueDate,
    calculateNextPlanDate,
    calculateSkippedPlanDate,
    countMissedOccurrences,
    clearPlanRuntimeState,
    formatDateOnly,
    normalizePlanPayload,
    parseDateOnly,
    resolveScheduledDateToComplete,
};
