import test from 'node:test';
import assert from 'node:assert/strict';
import { parseApedalarDetails, parseRecordePessoalDetails, publicLink } from '../app/lib/scrapers/eventDetailParsers.js';
import { sanitizeEventHtml } from '../app/lib/sanitizeHtml.js';
import { fpcDetailLink, prioritizeDetailChecks, needsFpcDetails } from '../app/lib/scrapers/detailQueue.js';
import { getEventDocuments } from '../app/utils/eventDocuments.js';
import { deepScrapeFPCWithRetry } from '../app/lib/scrapers/fpc.js';

test('FPC descriptions become visible without duplicating documents or losing schedules', () => {
    const event = sanitizeEventHtml({ source: 'FPC + Apedalar', description: '<p>Introdução</p>', programa:
        '<div class="fpc-description"><p>Percurso de 60 km</p><script>alert(1)</script></div><div class="fpc-downloads"><a href="https://example.com/a.pdf">Regulamento</a></div><table><tr><td>09:00</td></tr></table>' });
    assert.match(event.description, /Percurso de 60 km/);
    assert.doesNotMatch(event.description, /script/);
    assert.match(event.programContent, /09:00/);
    assert.doesNotMatch(event.programContent, /fpc-description|fpc-downloads/);
    assert.match(event.programa, /a.pdf/);
    assert.equal(sanitizeEventHtml(event).description, event.description);
});

test('legacy whole-page FPC descriptions expose only the race section', () => {
    const event = sanitizeEventHtml({ source: 'FPC', programa: '<div class="fpc-description"><div>Navigation outside the race</div><section class="main__middle__container"><p>Race information</p></section><footer>Footer</footer></div>' });
    assert.match(event.description, /Race information/);
    assert.doesNotMatch(event.description, /Navigation|Footer/);
});

test('Apedalar extracts event facts, prices and files, excluding participant data', () => {
    const event = parseApedalarDetails(`<h1>Passeio de ciclismo</h1>
      <section><h2>QUANDO?</h2><div>Domingo às 08:30</div><p>Pagamentos até dia 20</p></section>
      <section><h2>ONDE?</h2><div>Guarda</div></section>
      <section><div><h2>QUANTO?</h2></div><div>Inscrição <strong>15€</strong></div></section>
      <a download href="/regulamento.pdf">Regulamento</a><a href="/download/42">Track 61km</a>
      <div id="inscricoes-section"><div class="prose">PARTICIPANT_PRIVATE_DATA</div></div>
      <form><div class="prose">PAYMENT_PRIVATE_DATA</div></form>`, 'https://apedalar.pt/eventos/passeio');
    assert.match(event.description, /08:30/);
    assert.match(event.description, /Guarda/);
    assert.match(event.prices, /15€/);
    assert.doesNotMatch(event.description, /PRIVATE_DATA/);
    assert.equal(event.registrationClosesAt, undefined);
    assert.ok(event.extraLinks.some(link => link.link === 'https://apedalar.pt/regulamento.pdf'));
    assert.equal(event.image, null);
});

test('Recorde reads the editorial section and regulation, not registrations', () => {
    const event = parseRecordePessoalDetails(`<div class="eventoTitulo"><h1 class="titulosPaginasBold">Raid BTT</h1></div>
      <div class="eventoLeft"><div class="dataEvento">04 Outubro 2026 09h00</div><div class="cssTexto paginaEvento"><p>60 km; inscrição 19€.</p><a href="javascript:alert(1)">link</a></div></div>
      <div class="eventoRight"><a class="cartazEvento" href="/poster.jpg">Cartaz</a><a href="https://drive.google.com/file/d/42/view">CONSULTAR REGULAMENTO</a><a href="/inscritos">Lista inscritos</a></div>
      <table><tr><td>PARTICIPANT_PRIVATE_DATA</td></tr></table>`, 'https://www.recordepessoal.pt/evento/raid');
    assert.match(event.description, /60 km; inscrição 19€/);
    assert.doesNotMatch(event.description, /javascript|PRIVATE_DATA/);
    assert.match(event.programa, /09h00/);
    assert.equal(event.image, 'https://www.recordepessoal.pt/poster.jpg');
    assert.ok(event.extraLinks.some(link => link.label === 'CONSULTAR REGULAMENTO'));
    assert.ok(!event.extraLinks.some(link => link.link.endsWith('/inscritos')));
    assert.throws(() => parseRecordePessoalDetails('<form>Inscrever</form>', 'https://www.recordepessoal.pt'), /sem ficha/);
});

test('detail URLs reject invalid links and discover FPC in merged sources', () => {
    assert.equal(publicLink(undefined, 'https://apedalar.pt'), null);
    assert.equal(publicLink('javascript:alert(1)', 'https://apedalar.pt'), null);
    assert.equal(fpcDetailLink({ link: 'https://fpciclismo.pt.evil.test/pagina/race' }), null);
    assert.equal(fpcDetailLink({ link: 'https://www.fpciclismo.pt/' }), null);
    assert.equal(fpcDetailLink({ extraLinks: '[{"link":"https://www.fpciclismo.pt/pagina/race"}]' }), 'https://www.fpciclismo.pt/pagina/race');
});

test('existing programs are preserved and empty legacy wrappers remain pending', () => {
    assert.equal(needsFpcDetails({ programa: '<div class="fpc-buttons"></div>' }), true);
    assert.equal(needsFpcDetails({ programa: '<table><tr><td>09:00 Partida</td></tr></table>' }), false);
    assert.equal(needsFpcDetails({ programa: '<p>Detalhes de programa indisponíveis</p>' }), true);
});

test('publisher document viewers are visible without inventing their file format', () => {
    const documents = getEventDocuments({ extraLinks: [
        { label: 'Regulamento', link: 'https://drive.google.com/file/d/42/view' },
        { label: 'Track 61km', link: 'https://apedalar.pt/download/9957' },
        { label: 'Página da prova', link: 'https://apedalar.pt/eventos/prova' },
    ] });
    assert.equal(documents.length, 2);
    assert.ok(documents.every(doc => doc.format === 'LINK'));
    assert.equal(documents[0].label, 'Regulamento');
});

test('upcoming unchecked races take priority; attempted failures move back', () => {
    const now = new Date('2026-09-25T12:00:00Z');
    const records = [
        { id: 'past', sortDate: '2026-09-24' },
        { id: 'later', sortDate: '2026-10-02' },
        { id: 'attempted', sortDate: '2026-09-25', detailsCheckedAt: '2026-09-15' },
        { id: 'next', sortDate: '2026-09-26' },
    ];
    assert.deepEqual(prioritizeDetailChecks(records, now).map(row => row.id), ['next', 'later', 'attempted', 'past']);
});

test('an empty FPC page is not marked successfully enriched', async t => {
    t.mock.method(globalThis, 'fetch', async () => new Response('<html><body><nav>Menu</nav></body></html>'));
    await assert.rejects(deepScrapeFPCWithRetry('https://www.fpciclismo.pt/pagina/empty', 'empty', { attempts: 1 }), /não continha detalhes/);
});

test('FPC isolates race content and retains multiple category schedules', async t => {
    t.mock.method(globalThis, 'fetch', async () => new Response(`<html><body><div>GENERAL_NAVIGATION</div><a href="https://example.org/federation.pdf">Federation</a>
      <section class="main__middle__container"><h1>Race details</h1>
      <table class="dc_table_s20"><tr><td>09:00 Elite</td></tr></table>
      <table class="dc_table_s20"><tr><td>10:00 Masters</td></tr></table>
      <form>REGISTRATION_FORM<input value="private"></form></section></body></html>`));
    const html = await deepScrapeFPCWithRetry('https://www.fpciclismo.pt/pagina/race', 'race', { attempts: 1 });
    assert.match(html, /09:00 Elite/);
    assert.match(html, /10:00 Masters/);
    assert.doesNotMatch(html, /GENERAL_NAVIGATION|federation.pdf|REGISTRATION_FORM|private/);
});
