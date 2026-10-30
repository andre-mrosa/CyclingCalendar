import test from 'node:test';
import assert from 'node:assert/strict';
import { monthDays, shiftMonth, eventOccursOn, eventsInPeriod, sameDateGroup, groupEventsByDate, formatEventTitle, formatCalendarDateRange } from '../app/utils/calendarPresentation.js';

test('calendar ranges normalize ICU whitespace differences that broke hydration', t => {
    const variants = ['31 de outubro\u2009–\u20091 de novembro de 2026', '31 de outubro – 1 de novembro de 2026', '31 de outubro\u00a0–\u202f1 de novembro de 2026'];
    t.mock.method(Intl, 'DateTimeFormat', function (language, options) {
        assert.equal(language, 'pt');
        assert.equal(options.timeZone, 'UTC');
        return { formatRange: (start, end) => {
            assert.equal(start.toISOString(), '2026-10-31T00:00:00.000Z');
            assert.equal(end.toISOString(), '2026-11-01T00:00:00.000Z');
            return variants.shift();
        } };
    });
    for (let i = 0; i < 3; i++) assert.equal(formatCalendarDateRange('2026-10-31', '2026-11-01'), '31 de outubro – 1 de novembro de 2026');
});

test('calendar date labels retain localized single dates and ranges in all app languages', () => {
    for (const language of ['pt', 'en', 'es', 'fr']) {
        assert.equal(formatCalendarDateRange('2026-10-31', null, language), new Intl.DateTimeFormat(language, {dateStyle: 'long', timeZone: 'UTC'}).format(new Date('2026-10-31T00:00:00Z')).replace(/\s+/gu, ' '));
        const range = formatCalendarDateRange('2026-10-31', '2026-11-01', language);
        assert.match(range, /31/);
        assert.match(range, /2026/);
        assert.doesNotMatch(range, /[\u00a0\u2009\u202f]/u);
    }
});

test('shared dates combine separated events, sort ranges and keep unknown dates separate', () => {
    const a = { id: 'a', date: '19 SET 2026' };
    const b = { id: 'b', date: '19 SET 2026' };
    const c = { id: 'c', date: '19 a 20 SET 2026' };
    const d = { id: 'd', date: 'A definir' };
    const e = { id: 'e', date: 'A definir' };
    const f = { id: 'f', date: '20 SET 2026' };
    const events = [c, a, d, f, b, e];
    assert.deepEqual(groupEventsByDate(events), [[a, b], [c], [f], [d], [e]]);
    assert.deepEqual(groupEventsByDate([]), []);
    assert.deepEqual(events, [c, a, d, f, b, e]);
});

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
