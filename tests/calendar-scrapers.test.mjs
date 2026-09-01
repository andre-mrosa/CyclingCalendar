import test from 'node:test';
import assert from 'node:assert/strict';
import { deepScrapeFPCWithRetry, parseFPCCalendar, fetchFPCCalendar } from '../app/lib/scrapers/fpc.js';
import { parseStopAndGoEvent, scrapeEventPage } from '../app/lib/scrapers/stopandgo.js';
import { readStopAndGoHeader } from '../app/lib/scrapers/stopandgoParser.js';
import { getAmbito } from '../app/lib/scrapers/utils.js';
import { getEventDiscipline, isStageRace } from '../app/utils/eventClassifier.js';
import { mergeEventRecords } from '../app/lib/merging/eventMerger.js';
import { isSameEvent } from '../app/lib/merging/eventMatcher.js';
import { mergeEvents } from '../app/utils/mergeEvents.js';
import { filterEvents } from '../app/utils/filterEvents.js';

const fpcRow = (title, start, end = start, category = 'CN') => `<tr><th>${start}</th><th>${end}</th><td>${title}</td><td>Fundão</td><td>${category}</td><td>FPC</td><td></td></tr>`;
const fpcPage = (rows, year = '2026', from = '01') => `<form><select name="epoca_site"><option selected>${year}</option></select><select name="mes_de_new"><option selected>${from}</option></select><select name="mes_ate_new"><option selected>12</option></select></form><table class="dc_table_s12"><tbody>${rows}</tbody></table>`;
const sgPage = ({ title = 'Prova', modality = 'BTT', dates = '5 set 2026' } = {}) => `<nav><a>BTT</a><a>Gravel</a></nav><section><div><h1>${title}</h1><div>Maia, Portugal</div><div>${dates}</div><div>${modality}</div></div></section><aside>Campeonato Nacional de Gravel <span>20 set 2026</span></aside>`;
const url = 'https://stopandgo.net/events/prova-2026';

test('FPC submits the hidden marker and all twelve months, including next season', async t => {
    t.mock.method(globalThis, 'fetch', async (_url, options) => {
        const form = new URLSearchParams(options.body);
        assert.equal(form.get('epoca_site2'), '2027');
        assert.equal(form.get('epoca_site'), '2027');
        assert.equal(form.get('mes_de_new'), '01');
        assert.equal(form.get('mes_ate_new'), '12');
        return new Response(fpcPage(fpcRow('Campeonato Nacional XCO', '10-01-2027'), '2027'));
    });
    const events = await fetchFPCCalendar(2027);
    assert.equal(events[0].sortDate.toISOString(), '2027-01-10T00:00:00.000Z');
});

test('FPC detail requests are sequentially retried before succeeding', async t => {
    let requests = 0;
    t.mock.method(globalThis, 'fetch', async () => {
        requests++;
        if (requests < 3) return new Response('temporarily unavailable', { status: 503 });
        return new Response('<html><body><main>Informação detalhada da prova com conteúdo suficiente para ser validado e guardado no calendário.</main></body></html>');
    });
    const html = await deepScrapeFPCWithRetry('https://www.fpciclismo.pt/prova', { delayMs: 0 });
    assert.equal(requests, 3);
    assert.match(html, /detalhada da prova/);
});

test('FPC rejects the silent current-month fallback and wrong seasons', () => {
    assert.throws(() => parseFPCCalendar(fpcPage('', '2026', '08'), 2026), /calendário parcial/);
    assert.throws(() => parseFPCCalendar(fpcPage('', '2026'), 2027), /calendário parcial/);
    assert.throws(() => parseFPCCalendar(fpcPage(fpcRow('CN XCO', '10-01-2025')), 2026), /Época incorreta/);
});

test('An unpublished future season is empty only with its confirmed complete form', () => {
    const year = new Date().getFullYear() + 1;
    const html = fpcPage('', String(year)).replace('<table class="dc_table_s12"><tbody></tbody></table>', '<select name="classeprova_prova_new"><option value="">Escolha</option></select></html>');
    assert.deepEqual(parseFPCCalendar(html, year), []);
    assert.throws(() => parseFPCCalendar(html.replace('</html>', ''), year), /Tabela/);
});

test('FPC retains January, XCE/XCC, CRI/Fundo, event names and cross-month dates', () => {
    const events = parseFPCCalendar(fpcPage([
        fpcRow('Campeonatos Nacionais Pista', '23-01-2026', '25-01-2026', 'Pista CN'),
        fpcRow('Campeonato Nacional XCE', '26-06-2026', undefined, 'BTT XCE'),
        fpcRow('Campeonato Nacional XCC', '18-07-2026', undefined, 'BTT XCC'),
        fpcRow('Campeonatos Nacionais - CRI', '31-07-2026'),
        fpcRow('Campeonatos Nacionais - Fundo', '31-07-2026', '02-08-2026'),
        fpcRow('Evento Gravel para todos', '20-09-2026', undefined, 'CPT - Prova Aberta'),
        fpcRow('Campeonato Nacional XCC', '18-07-2026', undefined, 'BTT XCC')
    ].join('')), 2026);
    assert.equal(events.length, 6);
    assert.equal(events.filter(e => e.ambito === 'Campeonato Nacional').length, 5);
    assert.equal(events[1].tag, 'BTT XCE');
    assert.equal(events[2].tag, 'BTT XCC');
    assert.equal(events[4].sortDate.toISOString(), '2026-07-31T00:00:00.000Z');
    assert.match(events[4].date, /31 JUL 2026 a 02 AGO 2026/);
});

test('Only FPC title/class establishes national status, never promotional descriptions', () => {
    assert.equal(getAmbito('Gravel Para Todos', 'Coruche | CPT - Prova Aberta', '', 'Cabreira, FPC'), 'Prova Aberta');
    assert.notEqual(getAmbito('Gravel Para Todos', 'No fim de semana do Campeonato Nacional de Gravel'), 'Campeonato Nacional');
    assert.equal(getAmbito('Prova oficial', 'CN', '', 'FPC'), 'Campeonato Nacional');
    assert.notEqual(getAmbito('Campeonato Nacional XCO', '', '', 'Stop and Go'), 'Campeonato Nacional');
    const open = { title: 'Gravel Para Todos', source: 'Cabreira, FPC', details: 'Coruche | CPT - Prova Aberta', ambito: 'Campeonato Nacional', description: 'Campeonato Nacional de Gravel' };
    assert.equal(mergeEventRecords(open, open).ambito, 'Prova Aberta');
    assert.equal(filterEvents([open], { selectedAmbito: 'Campeonato Nacional' }).length, 0);
});

test('Championships remain distinct in database matching and client-side merging', () => {
    const official = (id, title) => ({ id, title, date: '26 JUN 2026', sortDate: new Date('2026-06-26'), source: 'FPC', ambito: 'Campeonato Nacional' });
    const events = [official('fpc-cri', 'Campeonatos Nacionais - CRI'), official('fpc-fundo', 'Campeonatos Nacionais - Fundo'), official('fpc-xce', 'Campeonato Nacional XCE')];
    assert.equal(mergeEvents(events).length, 3);
    assert.equal(isSameEvent({ ...events[0], id: 'sg-cri', source: 'Stop and Go, FPC' }, events[1]), false);
    assert.equal(isSameEvent(events[0], { ...events[1], id: 'sg-fundo', source: 'Stop and Go' }), false);
    assert.equal(isSameEvent(official('fpc-gravel', 'Campeonato Nacional Gravel'), { ...events[0], id: 'open', title: 'Gravel Para Todos', source: 'Cabreira' }), false);
});

test('Quarantined events cannot absorb newly imported cycling events', () => {
    const event = { id: 'old', title: 'GF Bragança', sortDate: new Date('2026-07-12'), source: 'Quarentena' };
    assert.equal(isSameEvent(event, { ...event, id: 'new', source: 'FPC' }), false);
    assert.equal(isSameEvent(event, { ...event, source: 'Stop and Go' }), false);
});

test('Stop and Go uses the event modality, ignoring cycling navigation and recommendations', () => {
    for (const modality of ['Trail', 'Urban Trail', 'Atletismo', 'TT', 'SkyRunning', 'Triathlon', 'Natação', 'Caminhada']) {
        assert.equal(parseStopAndGoEvent(sgPage({ title: 'Desafio Bike', modality }), url, { years: [2026] }), null, modality);
    }
    assert.equal(parseStopAndGoEvent(sgPage({ modality: '' }), url, { years: [2026] }), null);
    for (const modality of ['BTT', 'Ciclismo', 'Cycling', 'Gravel', 'Downhill MTB', 'Trail/BTT']) {
        const event = parseStopAndGoEvent(sgPage({ title: 'Trilhos da Serra', modality }), url, { years: [2026] });
        assert.ok(event, modality);
        assert.equal(event.details, 'Maia');
        assert.notEqual(event.ambito, 'Campeonato Nacional');
    }
});

test('Stop and Go reads exact header years and ranges, never inventing a current-year date', () => {
    const historical = sgPage({ dates: '<div>24 <span>mar 2017</span></div><div>30 <span>mar 2017</span></div>' });
    assert.equal(readStopAndGoHeader(historical).year, '2017');
    assert.equal(parseStopAndGoEvent(historical, url, { years: [2026] }), null);
    assert.equal(parseStopAndGoEvent(sgPage({ dates: '' }), url, { years: [2026] }), null);
    const event = parseStopAndGoEvent(sgPage({ dates: '<div>31 <span>jul 2026</span></div><div>2 <span>ago 2026</span></div>' }), url, { years: [2026] });
    assert.equal(event.sortDate.toISOString(), '2026-07-31T00:00:00.000Z');
    assert.equal(event.date, '31 JUL 2026 a 02 AGO 2026');
});

test('Discipline comes from the official class when the title is generic', () => {
    for (const tag of ['BTT XCO', 'BTT XCM', 'BTT XCE', 'BTT XCC', 'BTT XCR', 'Pista', 'Paraciclismo']) {
        assert.equal(getEventDiscipline('Campeonato Nacional', tag), tag);
    }
});

test('A national championship weekend is not a stage race', () => {
    assert.equal(isStageRace({ title: 'Campeonatos Nacionais - Fundo', date: '26 JUN 2026 a 28 JUN 2026' }), false);
    assert.equal(isStageRace({ title: 'Volta a Portugal', date: '01 AGO 2026 a 10 AGO 2026' }), true);
});

test('Stop and Go rate limiting is reported, never treated as an empty valid event', async t => {
    t.mock.method(globalThis, 'fetch', async () => new Response('Too many requests', { status: 429 }));
    await assert.rejects(() => scrapeEventPage(url), /HTTP 429/);
});
