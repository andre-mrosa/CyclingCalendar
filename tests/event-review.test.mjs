import test from 'node:test';
import assert from 'node:assert/strict';
import { getEventDocuments } from '../app/utils/eventDocuments.js';
import { getEventDiscipline, getEventCategories, isOfficialNationalChampionship } from '../app/utils/eventClassifier.js';
import { eventDateDisplay } from '../app/utils/eventDateDisplay.js';
import { calendarEntry, findCalendarConflict } from '../app/utils/calendarEntries.js';
import { filterEvents } from '../app/utils/filterEvents.js';

test('FPC scope and numeric classes do not turn a road event into MTB or a championship', () => {
    const event = { title: 'Grande Prémio Alves Barbosa', source: 'FPC', ambito: 'Nacional', details: 'Montemor-o-Velho | 2.12', tag: 'BTT' };
    assert.equal(getEventDiscipline(event), 'Estrada');
    assert.equal(isOfficialNationalChampionship(event), false);
    assert.equal(getEventDiscipline({ title: 'Prova de Estrada', details: 'Local | 2.12', tag: 'Estrada' }), 'Estrada');
});

test('Documents include FPC HTML downloads, identify KML accurately and deduplicate links', () => {
    const kml = 'https://www.fpciclismo.pt/calendarios_ficheiros/2026/anexo_percurso_gps-1.kml';
    const pdf = 'https://www.fpciclismo.pt/calendarios_ficheiros/2026/anexo_guia_tecnico-2.pdf';
    const docs = getEventDocuments({ extraLinks: JSON.stringify([{ link: kml, label: 'Link Adicional' }]), programa: `<a href="${kml}">Link Adicional</a><a href="${pdf}">Guia Técnico</a>` });
    assert.equal(docs.length, 2);
    assert.equal(docs[0].label, 'Percurso GPS (KML)');
    assert.equal(docs[1].format, 'PDF');
    assert.deepEqual(getEventDocuments({ extraLinks: 'malformed' }), []);
});

test('Family filter includes MTB specialities and specific filters remain specific', () => {
    const events = [{ title: 'Taça XCO' }, { title: 'Enduro' }, { title: 'Gravel' }];
    assert.equal(filterEvents(events, { selectedTags: ['BTT'] }).length, 2);
    assert.equal(filterEvents(events, { selectedTags: ['BTT XCO'] }).length, 1);
});

test('FPC class 2.17 corrects stale Masters classifications without changing unrelated sources', () => {
    const event = { title: 'Grande Prémio', source: 'FPC', details: 'Local | 2.17', tag: 'BTT', escaloes: '["Masters / Veteranos"]' };
    assert.equal(getEventDiscipline(event), 'Estrada');
    assert.deepEqual(getEventCategories(event), ['Sub-17 (Cadetes)']);
    assert.deepEqual(getEventCategories({ ...event, source: 'Outra' }), ['Masters / Veteranos']);
});

test('Date labels include both months and do not turn malformed dates into real days', () => {
    const value = eventDateDisplay({ date: '31 OUT 2026 a 01 NOV 2026' });
    assert.equal(value.day, '31–1');
    assert.equal(value.month, 'OUT/NOV');
    assert.equal(value.key, '2026-10');
    assert.equal(eventDateDisplay({ date: 'EVENTO', sortDate: '2027-12-01' }).key, 'unknown');
    assert.equal(eventDateDisplay({ date: '28 SET a 27 SET 2026' }).day, '—');
});

test('Calendar entries preserve actual reminders including defaults and no reminders', () => {
    const item = { start: { date: '2026-09-11' }, end: { date: '2026-09-14' } };
    assert.equal(calendarEntry(item).reminderMinutes, null);
    assert.deepEqual(calendarEntry({ ...item, reminders: { useDefault: false } }).reminderMinutes, []);
    assert.deepEqual(calendarEntry({ ...item, reminders: { useDefault: false, overrides: [{ minutes: 1440 }] } }).reminderMinutes, [1440]);
    assert.equal(calendarEntry({ ...item, status: 'cancelled' }), null);
});

test('Conflicts cover all days, excluding registration reminders and cancelled races', () => {
    const event = { id: '1', title: 'Prova', date: '11 SET 2026 a 13 SET 2026' };
    const entry = { start: '2026-09-13', end: '2026-09-14', allDay: true, title: 'Outra prova' };
    assert.equal(findCalendarConflict(event, { '2': entry }).hasConflict, true);
    assert.equal(findCalendarConflict(event, { '1': entry }).hasConflict, false);
    assert.equal(findCalendarConflict(event, { '2_reg_open': entry }).hasConflict, false);
    assert.equal(findCalendarConflict({ ...event, title: 'Prova cancelada' }, { '2': entry }).hasConflict, false);
    assert.equal(findCalendarConflict(event, { '2': { ...entry, start: '2026-09-10', end: '2026-09-11' } }).hasConflict, false);
});
