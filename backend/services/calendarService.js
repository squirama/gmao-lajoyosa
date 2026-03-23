function formatDate(dateObj) {
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getExceptionDate(planExceptions, planId, originalDateStr) {
    const match = planExceptions.find((exception) => (
        exception.plan_id === planId &&
        formatDate(new Date(exception.original_date)) === originalDateStr
    ));

    return match ? formatDate(new Date(match.new_date)) : null;
}

function buildHistoryEvents(historyRows) {
    return historyRows.map((historyRow) => ({
        id: `hist_${historyRow.id}`,
        title: `\u2705 ${historyRow.asset_name || 'Desconocido'}: ${historyRow.task_description || 'Tarea'}`,
        start: historyRow.performed_date,
        allDay: true,
        color: '#22c55e',
        extendedProps: { status: 'done', notes: historyRow.notes },
    }));
}

function buildProjectedPlanEvents(plans, planExceptions, today = new Date()) {
    const events = [];
    const referenceDay = new Date(today);
    referenceDay.setHours(0, 0, 0, 0);

    const horizonDate = new Date(referenceDay);
    horizonDate.setFullYear(horizonDate.getFullYear() + 1);

    plans.forEach((plan) => {
        if (!plan.next_due_date) {
            return;
        }

        const nextDue = new Date(plan.next_due_date);
        const nextDueStr = formatDate(nextDue);
        const nextDueException = getExceptionDate(planExceptions, plan.id, nextDueStr);
        const finalNextDueStr = nextDueException || nextDueStr;
        const finalNextDueDate = new Date(finalNextDueStr);

        let currentColor = nextDueException ? '#f97316' : '#3b82f6';
        let currentPrefix = '\ud83d\udcc5';

        if (finalNextDueDate < referenceDay) {
            currentColor = '#ef4444';
            currentPrefix = '\u26a0\ufe0f';
        }

        events.push({
            id: `plan_${plan.id}_next`,
            title: `${currentPrefix} ${plan.asset_name}: ${plan.task_description}`,
            start: finalNextDueStr,
            allDay: true,
            color: currentColor,
            extendedProps: {
                plan_id: plan.id,
                freq: plan.frequency_days,
                is_exception: Boolean(nextDueException),
            },
        });

        if (plan.frequency_days <= 0) {
            return;
        }

        if (plan.start_date) {
            const startDate = new Date(plan.start_date);
            const diff = (nextDue - startDate) / (1000 * 60 * 60 * 24);
            let startCycle = Math.floor(diff / plan.frequency_days) + 1;
            if (startCycle < 1) startCycle = 1;

            let cycleIndex = startCycle;
            for (let i = 0; i < 366; i += 1) {
                const projectedDate = new Date(startDate);
                projectedDate.setDate(projectedDate.getDate() + (cycleIndex * plan.frequency_days));

                if (projectedDate > horizonDate) {
                    break;
                }

                const projectedDateStr = formatDate(projectedDate);
                const projectedException = getExceptionDate(planExceptions, plan.id, projectedDateStr);
                const finalDateStr = projectedException || projectedDateStr;

                events.push({
                    id: `plan_${plan.id}_proj_${cycleIndex}`,
                    title: `\ud83d\udcc5 ${plan.asset_name}: ${plan.task_description}`,
                    start: finalDateStr,
                    allDay: true,
                    color: projectedException ? '#f97316' : '#3b82f6',
                    extendedProps: {
                        plan_id: plan.id,
                        freq: plan.frequency_days,
                        is_exception: Boolean(projectedException),
                    },
                });

                cycleIndex += 1;
            }
            return;
        }

        const currentDate = new Date(plan.next_due_date);
        const frequency = parseInt(plan.frequency_days, 10) || 7;
        currentDate.setDate(currentDate.getDate() + frequency);

        for (let i = 0; i < 366; i += 1) {
            if (currentDate > horizonDate) {
                break;
            }

            const dateStr = formatDate(currentDate);
            const projectedException = getExceptionDate(planExceptions, plan.id, dateStr);
            const finalDateStr = projectedException || dateStr;

            events.push({
                id: `plan_${plan.id}_legacy_${i}`,
                title: `\ud83d\udcc5 ${plan.asset_name}: ${plan.task_description}`,
                start: finalDateStr,
                allDay: true,
                color: projectedException ? '#f97316' : '#3b82f6',
                extendedProps: {
                    plan_id: plan.id,
                    freq: plan.frequency_days,
                    is_exception: Boolean(projectedException),
                },
            });

            currentDate.setDate(currentDate.getDate() + frequency);
        }
    });

    return events;
}

function buildCalendarEvents({ historyRows, plans, planExceptions, today = new Date() }) {
    return [
        ...buildHistoryEvents(historyRows),
        ...buildProjectedPlanEvents(plans, planExceptions, today),
    ];
}

module.exports = {
    buildCalendarEvents,
    buildHistoryEvents,
    buildProjectedPlanEvents,
    formatDate,
};
