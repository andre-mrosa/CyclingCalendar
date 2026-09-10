import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIcsContent, generateGoogleCalendarUrl, getCalendarDates } from '../app/utils/calendarExport.js';
import { buildEventsIcsContent, getGoogleCalendarDatePayload } from '../app/utils/calendarExport.js';
import { detectRaceDate } from '../app/utils/detectRaceDate.js';

const event = { id: 'prova/1', title: 'Prova de ciclismo', date: '20 SET 2026', sortDate: '2026-09-20T00:00:00.000Z' };

test('Alves Barbosa and ordinary weekends preserve every published day in all exports', () => {
    for (const title of ['Grande Prémio Alves Barbosa', 'Taça de Portugal XCO']) {
        const race = { ...event, title, date: '11 SET 2026 a 13 SET 2026', programa: 'Sábado secretariado. Domingo partida da competição às 09:00.' };
        assert.deepEqual(getCalendarDates(race), { start: '20260911', end: '20260914' });
        assert.deepEqual(getGoogleCalendarDatePayload(race), { start: { date: '2026-09-11' }, end: { date: '2026-09-14' } });
        assert.equal(detectRaceDate(race).startTime, null);
        const batch = buildEventsIcsContent([race]);
        assert.match(batch, /DTSTART;VALUE=DATE:20260911\r\nDTEND;VALUE=DATE:20260914/);
        assert.doesNotMatch(batch, /T090000/);
    }
});

test('Month and year boundaries retain explicit years and exclusive ends', () => {
    for (const [date, start, end] of [
        ['31 OUT a 01 NOV 2026', '20261031', '20261102'],
        ['31 DEZ 2026 a 02 JAN 2027', '20261231', '20270103'],
        ['31 DEZ a 02 JAN 2027', '20261231', '20270103'],
        ['29 FEV 2028', '20280229', '20280301'],
    ]) assert.deepEqual(getCalendarDates({ ...event, date }), { start, end });
});

test('Technical sort dates cannot turn unknown or malformed published dates into appointments', () => {
    for (const date of ['A definir', 'EVENTO', 'Adiado', '31 FEV 2026', '28 SET a 27 SET 2026', '6 e 20 SET 2026']) {
        const race = { ...event, date };
        assert.equal(getCalendarDates(race), null);
        assert.equal(getGoogleCalendarDatePayload(race), null);
        assert.equal(buildEventsIcsContent([race]), null);
    }
});

test('Batch ICS keeps separate valid events and ignores unknown dates', () => {
    const content = buildEventsIcsContent([event, { ...event, id: '2', date: '21 SET 2026' }, { ...event, date: 'A definir' }]);
    assert.equal(content.match(/BEGIN:VCALENDAR/g).length, 1);
    assert.equal(content.match(/BEGIN:VEVENT/g).length, 2);
    assert.equal(content.match(/BEGIN:VALARM/g).length, 2);
});

test('Google and ICS reserve the same full day without inventing a race time', () => {
    const dates = getCalendarDates(event);
    assert.deepEqual(dates, { start: '20260920', end: '20260921' });
    assert.equal(new URL(generateGoogleCalendarUrl(event)).searchParams.get('dates'), '20260920/20260921');
    const ics = buildIcsContent(event);
    assert.match(ics, /DTSTART;VALUE=DATE:20260920\r\nDTEND;VALUE=DATE:20260921/);
    assert.match(ics, /BEGIN:VALARM\r\nACTION:DISPLAY\r\nTRIGGER:-P1D/);
});

test('Stage events retain their date range with an exclusive end date', () => {
    assert.deepEqual(getCalendarDates({ ...event, title: 'Prova por etapas', date: '29 SET a 01 OUT 2026' }), { start: '20260929', end: '20261002' });
});

test('Missing and invalid dates never create an event for today', () => {
    for (const invalid of [null, {}, { sortDate: 'invalid' }, { date: '31 FEV 2026' }]) {
        assert.equal(buildIcsContent(invalid), null);
        assert.equal(generateGoogleCalendarUrl(invalid), null);
    }
});

test('ICS escapes text and folds UTF-8 lines without corrupting characters', () => {
    const ics = buildIcsContent({ ...event, title: 'Évora, BTT; ' + 'ação '.repeat(40) + '\r\nBEGIN:VEVENT' });
    const unfolded = ics.replace(/\r\n /g, '');
    assert.match(unfolded, /SUMMARY:Évora\\, BTT\\;/);
    assert.equal(ics.split('\r\nBEGIN:VEVENT').length, 2);
    assert.ok(unfolded.includes('\\nBEGIN:VEVENT'));
    assert.ok(unfolded.includes('/events/prova%2F1'));
    for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75);
});
