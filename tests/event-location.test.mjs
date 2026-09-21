import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveEventLocation, formatEventLocation, extractEventTown } from '../app/utils/eventLocation.js';
import { generateGoogleCalendarUrl, buildIcsContent } from '../app/utils/calendarExport.js';
import { resolveCoordinates } from '../app/lib/weather.js';
import { getDistrito } from '../app/lib/scrapers/utils.js';
import { withEventLocation } from '../app/lib/eventLocation.js';

test('published village survives display and both calendar exports', () => {
    const event = { id: 'test', title: 'Race', date: '21 SET 2026', details: 'Estoi | BTT', distrito: 'Faro' };
    assert.equal(formatEventLocation(event), 'Estoi, Faro');
    assert.equal(new URL(generateGoogleCalendarUrl(event)).searchParams.get('location'), 'Estoi, Faro');
    assert.match(buildIcsContent(event), /LOCATION:Estoi\\, Faro/);
    assert.equal(formatEventLocation({ details: 'Porto de Mós', distrito: 'Porto' }), 'Porto de Mós, Porto');
});

test('club names and titles never invent a village; unknown and district-only remain distinct', () => {
    assert.equal(extractEventTown({ title: 'ARLU', organizador: 'Azabuxo', details: 'Leiria' }), 'Leiria');
    assert.equal(resolveEventLocation({ title: 'Lousada', details: 'A Indicar' }).precision, 'unknown');
    assert.equal(extractEventTown({ details: 'A definir', distrito: 'Leiria' }), '');
    assert.equal(resolveEventLocation({ details: 'A definir', distrito: 'Leiria' }).precision, 'district');
});

test('only an explicit and unambiguous programme start refines the locality', () => {
    const event = { details: 'Paredes de Coura', distrito: 'Viana do Castelo' };
    const start = { title: 'Partida dos Participantes', location: 'Largo da Igreja, Vascões', locationUrl: 'https://maps.app.goo.gl/example' };
    const schedule = { days: [{ activities: [{ title: 'Secretariado', location: 'Câmara Municipal' }, start] }] };
    assert.equal(resolveEventLocation(event, schedule).label, start.location);
    assert.equal(resolveEventLocation(event, schedule).precision, 'start');
    schedule.days.push({ activities: [{ ...start, location: 'Outro local' }] });
    assert.equal(resolveEventLocation(event, schedule).precision, 'locality');
});

test('district inference prioritises the published locality and handles hyphens and ambiguity', () => {
    assert.equal(getDistrito('Clube de Lisboa', 'Proença a Nova'), 'Castelo Branco');
    assert.equal(getDistrito('Clube de Lisboa', 'Porto de Mós'), 'Leiria');
    assert.equal(getDistrito('Prova', 'Lagoa'), '');
});

test('stored programme HTML enriches the list without confusing registration and start', () => {
    const event = withEventLocation({ details: 'Ourique', distrito: 'Beja', programa: '<div><div>Sábado 24 Outubro</div><div><div><p>08:00</p><h6>Secretariado</h6><a href="https://maps.app.goo.gl/checkin">Pavilhão</a></div><div><p>09:00</p><h6>Partida</h6><a href="https://maps.app.goo.gl/start">Praça Padre António Pereira</a></div></div></div>' });
    assert.equal(event.locationInfo.precision, 'start');
    assert.equal(formatEventLocation(event), 'Praça Padre António Pereira (Ourique), Beja');
    assert.equal(event.locationInfo.mapUrl, 'https://maps.app.goo.gl/start');
});

test('weather resolves villages before cities and refuses unknown, foreign or ambiguous matches', async t => {
    let url;
    let results = [{ name: 'Estoi', country_code: 'PT', admin1: 'Faro', latitude: 37.09, longitude: -7.89 }];
    t.mock.method(globalThis, 'fetch', async value => { url = value; return { ok: true, json: async () => ({ results }) }; });
    assert.equal((await resolveCoordinates('Estoi', 'Faro')).name, 'Estoi, Faro');
    assert.equal(new URL(url).searchParams.get('countryCode'), 'PT');
    assert.equal(await resolveCoordinates('', 'Faro'), null);
    assert.equal(await resolveCoordinates('Porto de Mós', 'Leiria'), null);
    results = [...results, { ...results[0], longitude: -7.9 }];
    assert.equal(await resolveCoordinates('Estoi', 'Faro'), null);
    results = [{ ...results[0], country_code: 'BR' }];
    assert.equal(await resolveCoordinates('Estoi', 'Faro'), null);
});
