const test = require('node:test');
const assert = require('node:assert/strict');

const {
    buildCalendarEvents,
    buildHistoryEvents,
    buildProjectedPlanEvents,
    formatDate,
} = require('../services/calendarService');

test('formatDate devuelve YYYY-MM-DD en fecha local', () => {
    const date = new Date(2026, 2, 20);
    assert.equal(formatDate(date), '2026-03-20');
});

test('buildHistoryEvents mapea historial a eventos verdes', () => {
    const events = buildHistoryEvents([{
        id: 1,
        asset_name: 'Bomba',
        task_description: 'Revision',
        performed_date: '2026-03-10',
        notes: 'Todo bien',
    }]);

    assert.equal(events.length, 1);
    assert.equal(events[0].id, 'hist_1');
    assert.equal(events[0].start, '2026-03-10');
    assert.equal(events[0].color, '#22c55e');
    assert.equal(events[0].extendedProps.status, 'done');
});

test('buildProjectedPlanEvents aplica excepciones y marca vencidos', () => {
    const events = buildProjectedPlanEvents(
        [{
            id: 4,
            asset_name: 'Ascensor',
            task_description: 'Inspeccion',
            next_due_date: '2026-03-10',
            start_date: '2026-03-10',
            frequency_days: 30,
        }],
        [{
            plan_id: 4,
            original_date: '2026-04-09',
            new_date: '2026-04-11',
        }],
        new Date(2026, 2, 20)
    );

    assert.equal(events[0].id, 'plan_4_next');
    assert.equal(events[0].color, '#ef4444');
    assert.equal(events[0].start, '2026-03-10');

    const projectedExceptionEvent = events.find((event) => event.id === 'plan_4_proj_1');
    assert.ok(projectedExceptionEvent);
    assert.equal(projectedExceptionEvent.start, '2026-04-11');
    assert.equal(projectedExceptionEvent.color, '#f97316');
    assert.equal(projectedExceptionEvent.extendedProps.is_exception, true);
});

test('buildCalendarEvents combina historial y proyecciones', () => {
    const events = buildCalendarEvents({
        historyRows: [{
            id: 8,
            asset_name: 'Compresor',
            task_description: 'Cambio filtro',
            performed_date: '2026-03-05',
            notes: 'Hecho',
        }],
        plans: [{
            id: 2,
            asset_name: 'Compresor',
            task_description: 'Cambio filtro',
            next_due_date: '2026-03-25',
            start_date: '2026-03-25',
            frequency_days: 15,
        }],
        planExceptions: [],
        today: new Date(2026, 2, 20),
    });

    assert.ok(events.some((event) => event.id === 'hist_8'));
    assert.ok(events.some((event) => event.id === 'plan_2_next'));
});
