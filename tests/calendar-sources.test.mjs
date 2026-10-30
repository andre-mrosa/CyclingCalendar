import test from 'node:test';
import assert from 'node:assert/strict';
import { CALENDAR_SOURCES, normalizeCalendarSources, selectCalendarSources } from '../app/lib/calendarSources.js';
import { decodeSearch, searchUrl } from '../app/utils/savedSearches.js';

test('disabled sources stay disabled in server data and shared searches', () => {
    const events = [{ id: 'fpc', source: 'FPC' }, { id: 'cabreira', source: 'Cabreira' }, { id: 'shared', source: 'FPC + Stop and Go' }];
    assert.deepEqual(selectCalendarSources(events, []), []);
    assert.deepEqual(selectCalendarSources(events, ['Cabreira']), [events[1]]);
    assert.deepEqual(selectCalendarSources(events, ['Stop and Go']), [events[2]]);
    assert.deepEqual(selectCalendarSources(events, CALENDAR_SOURCES), events);
    assert.equal(selectCalendarSources(null, []), undefined);
    assert.deepEqual(normalizeCalendarSources([]), []);
    const shared = new URL(searchUrl('https://www.cyclingcalendar.pt/', { sources: [] }));
    assert.deepEqual(decodeSearch(shared.searchParams.get('filters')).sources, []);
});
