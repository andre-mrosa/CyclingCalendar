import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCalendarByDate } from '../app/utils/calendarList.js';
import { lisbonWallClock } from '../app/utils/planning.js';

test('September 21 hides races finished on 19 and 20, retaining today and ongoing races', () => {
    const events = ['19 SET 2026', '20 SET 2026', '19 a 20 SET 2026', '21 SET 2026', '19 a 22 SET 2026', '22 SET 2026', 'A definir'].map(date => ({ date }));
    const today = lisbonWallClock(new Date('2026-09-20T23:00:00Z')).slice(0, 10);
    assert.equal(today, '2026-09-21');
    assert.deepEqual(filterCalendarByDate(events, 'futuros', today), events.slice(3));
    assert.deepEqual(filterCalendarByDate(events, 'passados', today), events.slice(0, 3));
    assert.deepEqual(filterCalendarByDate(events, 'todos', today), events);
});

test('the same event data is filtered again when the Lisbon day changes', () => {
    const events = [{ date: '20 SET 2026' }];
    const before = lisbonWallClock(new Date('2026-09-20T22:59:59Z')).slice(0, 10);
    const after = lisbonWallClock(new Date('2026-09-20T23:00:00Z')).slice(0, 10);
    assert.deepEqual(filterCalendarByDate(events, 'futuros', before), events);
    assert.deepEqual(filterCalendarByDate(events, 'futuros', after), []);
    assert.equal(lisbonWallClock(new Date('2026-12-20T23:00:00Z')).slice(0, 10), '2026-12-20');
});

test('enumerated multi-day events remain visible during their ongoing days', () => {
    const events = [{ date: '16, 17, E 18 OUT 2026', sortDate: '2026-10-16T00:00:00.000Z' }];
    const day17 = '2026-10-17';
    const day18 = '2026-10-18';
    const day19 = '2026-10-19';
    assert.equal(filterCalendarByDate(events, 'futuros', day17).length, 1);
    assert.equal(filterCalendarByDate(events, 'futuros', day18).length, 1);
    assert.equal(filterCalendarByDate(events, 'futuros', day19).length, 0);
});

