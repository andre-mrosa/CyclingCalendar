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
