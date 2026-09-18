import test from 'node:test';
import assert from 'node:assert/strict';
import { monthDays, shiftMonth, eventOccursOn, eventsInPeriod, sameDateGroup, formatEventTitle } from '../app/utils/calendarPresentation.js';

test('list titles soften source capitals without changing mixed-case names or race acronyms', () => {
    assert.equal(formatEventTitle('À CONQUISTA DA TORRE'), 'À Conquista da Torre');
    assert.equal(formatEventTitle('TAÇA DE PORTUGAL BTT XCO 2026'), 'Taça de Portugal BTT XCO 2026');
    assert.equal(formatEventTitle('iRide BTT em Portugal'), 'iRide BTT em Portugal');
    assert.equal(formatEventTitle(''), '');
});

test('month navigation crosses year boundaries and uses Monday-first complete weeks', () => {
    assert.equal(shiftMonth('2026-12', 1), '2027-01');
    assert.equal(shiftMonth('2026-01', -1), '2025-12');
    const february = monthDays('2024-02');
    assert.equal(february.filter(Boolean).length, 29);
    assert.equal(february[3], '2024-02-01');
    assert.equal(february.length % 7, 0);
    assert.equal(monthDays('2026-02')[6], '2026-02-01');
});

test('multi-day events remain discoverable on every day including a month boundary', () => {
    const event = { id: 'tour', date: '30 SET a 2 OUT 2026', sortDate: '2026-09-30' };
    assert.equal(eventOccursOn(event, '2026-10-01'), true);
    assert.equal(eventOccursOn(event, '2026-10-02'), true);
    assert.equal(eventOccursOn(event, '2026-10-03'), false);
    assert.deepEqual(eventsInPeriod([event], '2026-10', null), [event]);
    assert.deepEqual(eventsInPeriod([event], '2026-09', null), [event]);
});

test('unknown dates stay in the unrestricted list but never acquire a calendar day', () => {
    const unknown = { date: 'A definir', sortDate: '2026-09-01' };
    assert.equal(eventOccursOn(unknown, '2026-09-01'), false);
    assert.deepEqual(eventsInPeriod([unknown], null, null), [unknown]);
    assert.deepEqual(eventsInPeriod([unknown], '2026-09', null), []);
});

test('date grouping never hides a different end date or unknown date', () => {
    const single = { date: '19 SET 2026', sortDate: '2026-09-19' };
    const stage = { date: '19 a 20 SET 2026', sortDate: '2026-09-19' };
    assert.equal(sameDateGroup(single, { ...single, title: 'Another event' }), true);
    assert.equal(sameDateGroup(single, stage), false);
    assert.equal(sameDateGroup({ date: 'A definir' }, { date: 'A definir' }), false);
    assert.equal(sameDateGroup(single, undefined), false);
});
