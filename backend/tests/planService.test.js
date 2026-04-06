const test = require('node:test');
const assert = require('node:assert/strict');

const {
    calculateNextUnresolvedDueDate,
    calculateNextPlanDate,
    calculateSkippedPlanDate,
    countMissedOccurrences,
    normalizePlanPayload,
    resolveScheduledDateToComplete,
} = require('../services/planService');

function formatLocalDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

test('calculateNextPlanDate devuelve null para planes no recurrentes', () => {
    assert.equal(calculateNextPlanDate({ frequency_days: 0 }), null);
});

test('calculateNextPlanDate suma la frecuencia sobre next_due_date', () => {
    const result = calculateNextPlanDate({
        frequency_days: 30,
        start_date: '2026-01-01',
        next_due_date: '2026-02-01',
        force_dow: false,
    });

    assert.equal(formatLocalDate(result), '2026-03-03');
});

test('calculateSkippedPlanDate lanza error en planes no recurrentes', () => {
    assert.throws(
        () => calculateSkippedPlanDate({ frequency_days: 0 }),
        /Cannot skip a non-recurring task/
    );
});

test('normalizePlanPayload inicializa fechas y flags', () => {
    const result = normalizePlanPayload({
        asset_id: 5,
        task_description: 'Lubricacion',
        frequency_days: 15,
        notify_external: true,
        start_date: '2026-03-10',
        notification_email: 'test@example.com',
        is_legal: true,
        force_dow: true,
    });

    assert.equal(result.assetId, 5);
    assert.equal(result.taskDescription, 'Lubricacion');
    assert.equal(result.frequencyDays, 15);
    assert.equal(result.notifyExternal, true);
    assert.equal(result.notificationEmail, 'test@example.com');
    assert.equal(result.isLegal, true);
    assert.equal(result.forceDow, true);
    assert.equal(formatLocalDate(result.startDate), '2026-03-10');
    assert.equal(formatLocalDate(result.nextDueDate), '2026-03-10');
});

test('normalizePlanPayload acepta correo de notificacion vacio y lo deja a null', () => {
    const result = normalizePlanPayload({
        asset_id: 5,
        task_description: 'Lubricacion',
        frequency_days: 15,
        notify_external: true,
        start_date: '2026-03-10',
        notification_email: '',
    });

    assert.equal(result.notifyExternal, true);
    assert.equal(result.notificationEmail, null);
});

test('resolveScheduledDateToComplete usa la ultima ocurrencia pendiente ya vencida', () => {
    const result = resolveScheduledDateToComplete({
        frequency_days: 7,
        next_due_date: '2026-03-01',
    }, {
        performedDate: new Date(2026, 2, 16),
        completedScheduledDates: ['2026-03-08'],
    });

    assert.equal(formatLocalDate(result), '2026-03-15');
});

test('calculateNextUnresolvedDueDate mantiene el vencido antiguo si se completa uno posterior', () => {
    const result = calculateNextUnresolvedDueDate({
        frequency_days: 7,
        next_due_date: '2026-03-01',
    }, ['2026-03-08', '2026-03-15']);

    assert.equal(formatLocalDate(result), '2026-03-01');
});

test('countMissedOccurrences descuenta las ocurrencias ya cumplidas aunque haya atrasos anteriores', () => {
    const result = countMissedOccurrences({
        frequency_days: 7,
        next_due_date: '2026-03-01',
    }, ['2026-03-08'], new Date(2026, 2, 16));

    assert.equal(result, 2);
});
