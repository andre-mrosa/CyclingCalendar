import test from 'node:test';
import assert from 'node:assert/strict';
import { monthCollection, nextPersonalEvent, publishedLocationOptions, calendarReturnPath, upcomingRelatedEvents } from '../app/utils/calendarInterface.js';
import { filterEvents } from '../app/utils/filterEvents.js';
import { normalizeSearch, savedSearchMatches } from '../app/utils/savedSearches.js';
import { removePersonalEvent } from '../app/utils/personalCollection.js';

const race = (id, date, extras = {}) => ({ id, title: 'Prova BTT ' + id, date, tag: 'BTT', ...extras });
test('monthly presentation retains ongoing ranges and unknown dates without inventing a calendar day', () => {
    const events = [race('ongoing', '30 OUT a 04 NOV 2026'), race('next', '08 NOV 2026'), race('later', '05 DEZ 2026'), race('unknown', 'Por confirmar')];
    assert.deepEqual(monthCollection(events, '2026-11', null, true).map(e => e.id), ['ongoing', 'next', 'unknown']);
    assert.deepEqual(monthCollection(events, '2026-11', '2026-11-03', true).map(e => e.id), ['ongoing']);
    assert.equal(monthCollection(events, null, null, true).length, 4);
    assert.equal(nextPersonalEvent(events, '2026-11-03', e => e.id === 'next' ? 'registered' : null).id, 'next');
    assert.equal(nextPersonalEvent(events, '2026-11-03', () => null), null);
});
test('location search accepts punctuation and accent variants while legacy exact filters remain exact', () => {
    const events = [race('one', '08 NOV 2026', { distrito: 'Albergaria-a-Velha' }), race('two', '08 NOV 2026', { distrito: 'Albergaria a Velha' }), race('other', '08 NOV 2026', { distrito: 'Coimbra' })];
    assert.equal(publishedLocationOptions(events).length, 2);
    assert.deepEqual(filterEvents(events, { selectedLocation: 'albergaria velha' }).map(e => e.id), ['one', 'two']);
    assert.deepEqual(filterEvents(events, { selectedDistrito: 'Albergaria-a-Velha' }).map(e => e.id), ['one']);
    assert.equal(normalizeSearch({ selectedLocation: 'Albergaria a Velha' }).selectedLocation, 'Albergaria a Velha');
    assert.equal(savedSearchMatches({ selectedLocation: 'Coimbra' }, { selectedLocation: 'Leiria' }), false);
    assert.equal(savedSearchMatches({}, { selectedLocation: '' }), true);
});
test('multi-day championships are not stage races and unknown dates are not one-day races', () => {
    const events = [race('stage', '13 a 15 NOV 2026', { title: 'Desafio BTT por etapas' }), race('weekend', '21 a 22 NOV 2026', { title: 'Campeonato Nacional de BTT' }), race('day', '08 NOV 2026'), race('unknown', 'Por confirmar')];
    assert.deepEqual(filterEvents(events, { selectedType: 'Etapas' }).map(e => e.id), ['stage']);
    assert.deepEqual(filterEvents(events, { selectedType: 'Vários Dias' }).map(e => e.id), ['weekend']);
    assert.deepEqual(filterEvents(events, { selectedType: 'Um Dia' }).map(e => e.id), ['day']);
});
test('related events exclude past races, aliases of this race and duplicate aliases', () => {
    const current = race('current', '08 NOV 2026', { _allIds: ['old-source'] });
    const catalogue = [race('past', '18 OUT 2026'), race('old-source', '08 NOV 2026'), race('next', '15 NOV 2026', { _allIds: ['duplicate'] }), race('duplicate', '15 NOV 2026'), race('wrong-discipline', '14 NOV 2026', { tag: 'Gravel', title: 'Gravel' }), race('later', '05 DEZ 2026')];
    assert.deepEqual(upcomingRelatedEvents(current, catalogue, '2026-11-03').map(e => e.id), ['next', 'later']);
});
test('return navigation accepts only calendar pages on this site', () => {
    assert.equal(calendarReturnPath('/minhas-provas?filters=%7B%7D'), '/minhas-provas?filters=%7B%7D');
    for (const path of ['//evil.test/', 'https://evil.test/', 'javascript:alert(1)', '/api/admin', '/admin', null]) assert.equal(calendarReturnPath(path), '/');
});
test('personal removal asks first and never hides an event if Google removal fails', async () => {
    const calls = [];
    const operations = { inCalendar: true, confirm: async () => { calls.push('confirm'); return true; }, removeCalendar: async () => { calls.push('google'); }, removePersonal: async () => { calls.push('personal'); } };
    assert.equal(await removePersonalEvent({ ...operations, confirm: () => false }), false);
    assert.deepEqual(calls, []);
    assert.equal(await removePersonalEvent(operations), true);
    assert.deepEqual(calls, ['confirm', 'google', 'personal']);
    calls.length = 0;
    await assert.rejects(removePersonalEvent({ ...operations, removeCalendar: () => { throw Error('provider failed'); } }), /provider failed/);
    assert.deepEqual(calls, ['confirm']);
    calls.length = 0;
    await removePersonalEvent({ ...operations, inCalendar: false });
    assert.deepEqual(calls, ['confirm', 'personal']);
});
