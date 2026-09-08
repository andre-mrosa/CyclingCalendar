import test from 'node:test';
import assert from 'node:assert/strict';
import { buildIcsContent, generateGoogleCalendarUrl, getCalendarDates } from '../app/utils/calendarExport.js';

const event = { id: 'prova/1', title: 'Prova de ciclismo', date: '20 SET 2026', sortDate: '2026-09-20T00:00:00.000Z' };

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
