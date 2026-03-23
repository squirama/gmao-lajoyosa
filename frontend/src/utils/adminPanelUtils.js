export function toLocalDateInputValue(date) {
    const offset = date.getTimezoneOffset();
    const dateLocal = new Date(date.getTime() - (offset * 60 * 1000));
    return dateLocal.toISOString().split('T')[0];
}

export function generatePlanProjections(plans, months = 12) {
    if (!Array.isArray(plans)) return [];

    const events = [];
    const limit = new Date();
    limit.setMonth(limit.getMonth() + months);

    plans.forEach((plan) => {
        if (!plan.next_due_date || plan.frequency_days < 1) return;

        let current = new Date(plan.next_due_date);
        let safeGuard = 0;

        while (current <= limit && safeGuard < 100) {
            events.push({
                date: new Date(current),
                task: plan.task_description,
                plan_id: plan.id,
                freq: plan.frequency_days,
            });
            current.setDate(current.getDate() + plan.frequency_days);
            safeGuard += 1;
        }
    });

    return events.sort((left, right) => left.date - right.date);
}

export function triggerBlobDownload(data, filename) {
    const link = document.createElement('a');
    link.href = window.URL.createObjectURL(new Blob([data]));
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
}
