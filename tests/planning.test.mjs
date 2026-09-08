import test from 'node:test';
import assert from 'node:assert/strict';
import { parseRegistrationDates, withRegistrationDates, registrationPriceSummary } from '../app/utils/registrationDates.js';

test('price summary preserves phases and excludes insurance or refund amounts', () => {
    const summary = registrationPriceSummary('<p>Seguro: 30000€</p><p>5.5. Valores de inscrição:</p><p>1ª Fase — Federados: 43€</p><p>2ª Fase — Não federados: 51€</p><p>5.6. A inscrição dá direito a medalha.</p>');
    assert.match(summary, /43€/);
    assert.match(summary, /2ª Fase — Não federados: 51€/);
    assert.doesNotMatch(summary, /30000|medalha/);
    assert.equal(registrationPriceSummary('Seguro 30000€'), null);
});
import { mergeEvents } from '../app/utils/mergeEvents.js';
import { matchesPeriod, lisbonWallClock, isCancelled, registrationDaysUntil } from '../app/utils/planning.js';

test('weekend shortcut includes the current Sunday and crosses year boundaries', () => {
    assert.equal(matchesPeriod({ sortDate: '2026-09-13' }, 'weekend', new Date('2026-09-13T12:00Z')), true);
    assert.equal(matchesPeriod({ sortDate: '2026-09-19' }, 'weekend', new Date('2026-09-13T12:00Z')), false);
    assert.equal(matchesPeriod({ sortDate: '2027-01-02' }, 'weekend', new Date('2026-12-31T12:00Z')), true);
    assert.equal(matchesPeriod({ sortDate: 'invalid' }, 'weekend'), false);
    assert.equal(matchesPeriod({ date: '11-13 SET 2026', sortDate: '2026-09-11' }, 'weekend', new Date('2026-09-08')), true);
});
test('registration shortcut respects Lisbon summer time and unknown dates', () => {
    const now = new Date('2026-09-08T22:30:00Z');
    assert.equal(lisbonWallClock(now), '2026-09-08T23:30:00.000Z');
    assert.equal(registrationDaysUntil('2026-09-08T23:59:00.000Z', now), 0);
    assert.equal(registrationDaysUntil('2026-09-08T23:00:00.000Z', now), -1);
    assert.equal(matchesPeriod({ registrationOpensAt: '2026-03-30T20:00:00.000Z', registrationClosesAt: '2026-09-08T23:59:00.000Z' }, 'open', now), true);
    assert.equal(matchesPeriod({ registrationClosesAt: '2026-09-08T23:59:00.000Z' }, 'open', now), false);
    assert.equal(matchesPeriod({ registrationOpensAt: '2026-03-30T20:00:00.000Z', registrationClosesAt: '2026-09-08T23:00:00.000Z' }, 'open', now), false);
    assert.equal(isCancelled({ title: 'Taça BMX - Anulada / Canceled' }), true);
    assert.equal(matchesPeriod({ title: 'Taça - Anulada', sortDate: '2026-09-13' }, 'weekend', new Date('2026-09-08')), false);
});

test('same day with different display dates merges sources without losing saved IDs', () => {
    const a = { id: 'sg-1', title: 'Monção e Melgaço Gf 2026', sortDate: '2026-09-20', date: '20 SET', source: 'Stop and Go', link: 'https://example.com/a' };
    const b = { id: 'fpc-1', title: 'Monção e Melgaço Granfondo 2026', sortDate: '2026-09-20T00:00:00Z', date: '20 SET 2026', source: 'FPC', link: 'https://example.com/b' };
    const merged = mergeEvents([a, b]);
    assert.equal(merged.length, 1);
    assert.deepEqual(merged[0]._allIds, ['sg-1', 'fpc-1']);
    assert.equal(merged[0].extraLinks.length, 2);
    assert.equal(a._allIds, undefined);
    assert.equal(mergeEvents([a, { ...b, sortDate: '2026-09-21' }]).length, 2);
});

test('aggregated FPC sources merge exact open-ride identities, preserving distinct official rows', () => {
    const base = { date: '12 SET 2026', sortDate: '2026-09-12', ambito: 'Prova Aberta', details: 'Ribeira de Pena | CPT', source: 'Cabreira, Stop and Go, FPC' };
    const a = { ...base, id: 'cabreira-rota', title: 'Rota de Basto' };
    const b = { ...base, id: 'fpc-rota', title: 'NGPS - ROTA DE BASTO', source: 'FPC' };
    assert.equal(mergeEvents([a,b]).length, 1);
    assert.equal(mergeEvents([{...a,id:'fpc-original'},b]).length, 2);
    assert.equal(mergeEvents([a,{...b,details:'Outra localidade'}]).length, 2);
    assert.equal(mergeEvents([a,{...b,ambito:'Campeonato Nacional'}]).length, 2);
});

test('Lousã: preserves opening hour and uses overall deadline rather than first phase', () => {
    const result = parseRegistrationDates('<p>1ª Fase — abertura dia 30-03-2026 pelas 20h00 e encerramento às 23h59 do dia 16-08-2026.</p><p>2ª Fase — abertura dia 17-08-2026 pelas 00h01.</p><p>As inscrições encerram dia 08-09-2026 pelas 23h59, ou quando esgotem.</p>');
    assert.equal(result.registrationOpensAt, '2026-03-30T20:00:00.000Z');
    assert.equal(result.registrationClosesAt, '2026-09-08T23:59:00.000Z');
});
test('does not mistake refund or phase deadline for registration closing', () => {
    assert.equal(parseRegistrationDates('Desistência até ao dia 12-06-2026. 1ª fase encerramento dia 15-05-2026.').registrationClosesAt, null);
});
test('rejects invalid dates and conflicting closing statements', () => {
    assert.equal(parseRegistrationDates('Inscrições encerram dia 31-02-2026.').registrationClosesAt, null);
    assert.equal(parseRegistrationDates('Inscrições encerram dia 10-09-2026. Inscrições encerram dia 11-09-2026.').registrationClosesAt, null);
});
test('repeated markup is not a conflict and existing dates survive missing text', () => {
    assert.equal(parseRegistrationDates('Inscrições encerram dia 10/09/2026. Inscrições encerram dia 10/09/2026.').registrationClosesAt, '2026-09-10T23:59:00.000Z');
    assert.equal(withRegistrationDates({ registrationOpensAt: '2026-01-01', prices: '' }).registrationOpensAt, '2026-01-01');
});
