import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { originalEventUrl, toPublicEvent, PUBLIC_EVENT_SELECT } from '../app/lib/publicEvent.js';
import { queryCalendarList } from '../app/lib/calendarListQuery.js';
import { buildIcsContent, generateGoogleCalendarUrl } from '../app/utils/calendarExport.js';
import { maintenanceResponse } from '../app/lib/contentReleasePolicy.js';
import { retiredContentResponse } from '../app/lib/publicEvent.js';

const historical = { id: 'example', title: 'Prova exemplo', date: '04 OUT 2026', sortDate: new Date('2026-10-04'), distrito: 'Braga', source: 'FPC', link: 'https://www.fpciclismo.pt/prova/example?utm_source=old',
    description: 'PRIVATE_DESCRIPTION', image: 'PRIVATE_IMAGE', logo: 'PRIVATE_LOGO', programa: 'PRIVATE_PROGRAM', details: 'PRIVATE_DETAILS', prices: 'PRIVATE_PRICES',
    translations: [{ title: 'PRIVATE_TRANSLATION' }], listSummary: { locationInfo: { label: 'PRIVATE_LOCATION' } }, extraLinks: [{ link: 'PRIVATE_DOCUMENT' }], gpxData: 'PRIVATE_GPX', lat: 41, lng: -8 };

test('database and browser projection expose only name, date, locality and source link', async () => {
    let calls = 0;
    const events = await queryCalendarList({ event: { findMany: async ({ select }) => {
        calls++; assert.deepEqual(select, PUBLIC_EVENT_SELECT);
        for (const key of ['description', 'details', 'translations', 'listSummary', 'programa', 'image', 'extraLinks', 'tag', 'ambito', 'escaloes', 'licenca']) assert.equal(select[key], undefined);
        return [{ ...historical, futureSensitiveField: 'PRIVATE_FUTURE' }];
    } } }, [], ['FPC']);
    assert.equal(calls, 1);
    assert.equal(events.length, 1);
    assert.doesNotMatch(JSON.stringify(events), /PRIVATE_|registration|gpx|lat"|lng"/);
    assert.deepEqual(toPublicEvent(events[0]), events[0]);
});

test('links allow source event pages but never executable URLs, files, credentials or lookalike hosts', () => {
    assert.equal(toPublicEvent(historical).link, 'https://www.fpciclismo.pt/prova/example');
    for (const url of ['javascript:alert(1)', 'data:text/html,test', '//stopandgo.net/events/a', 'https://stopandgo.net.evil.test/a', 'https://user@stopandgo.net/a', 'https://stopandgo.net:8443/a', 'https://localhost/a', 'https://cabreirasolutions.com/a.gpx', 'https://apedalar.pt/media/a', '/media/events/a.png']) {
        assert.equal(originalEventUrl(url), null, url);
        assert.equal(toPublicEvent({ ...historical, link: url }), null);
    }
    assert.equal(toPublicEvent({ ...historical, source: 'FPC, Quarentena' }), null);
});

test('exports contain original links and district, never historical descriptions or images', () => {
    const content = buildIcsContent(historical).replace(/\r\n /g, '');
    assert.match(content, /URL:https:\/\/www.fpciclismo.pt\/prova\/example/);
    assert.match(content, /LOCATION:Braga/);
    assert.doesNotMatch(content, /PRIVATE_|cyclingcalendar.pt\/events\//);
    const google = new URL(generateGoogleCalendarUrl(historical));
    assert.equal(google.searchParams.get('location'), 'Braga');
    assert.doesNotMatch(google.searchParams.get('details'), /PRIVATE_/);
});

test('removed HTTP features cannot start a fetch, even with a cron secret or user-supplied URL', async t => {
    let calls = 0;
    t.mock.method(globalThis, 'fetch', () => { calls++; throw Error('Network forbidden'); });
    for (const path of ['programa', 'image-proxy', 'gpx', 'download-track', 'weather', 'road-distance', 'translate', 'sync-gpx', 'test-cabreira', 'force-cabreira', 'force-scrape', 'force-scrape-all', 'calendar/add', 'admin/translate-all', 'cron/alerts', 'cron/scrape']) {
        const route = await import(`../app/api/${path}/route.js`);
        for (const method of ['GET', 'POST'].filter(method => route[method])) {
            const result = await route[method](new Request('https://calendar.test/api/' + path + '?url=https://example.com/a', { method, headers: { authorization: 'Bearer test-secret' } }));
            assert.equal(result.status, 410, path);
            assert.equal(result.headers.get('cache-control'), 'no-store');
        }
    }
    assert.equal(calls, 0);
});

test('event assets are absent from public and sitemap cannot read the old event catalogue', () => {
    assert.equal(existsSync(new URL('../public/media/events', import.meta.url)), false);
    const sitemap = readFileSync(new URL('../app/sitemap.js', import.meta.url), 'utf8');
    assert.doesNotMatch(sitemap, /prisma|\/events\//);
});

test('production calendar is open; retired files remain closed', async t => {
    const previous = process.env.NODE_ENV;
    t.after(() => { if (previous === undefined) delete process.env.NODE_ENV; else process.env.NODE_ENV = previous; delete globalThis.__minimalProxy; });
    let middlewareCalls = 0;
    globalThis.__minimalProxy = { PUBLIC_RELEASE_APPROVED: true, maintenanceResponse, retiredContentResponse,
        clerkMiddleware: () => () => { middlewareCalls++; return new Response('local preview'); } };
    const source = readFileSync(new URL('../proxy.js', import.meta.url), 'utf8').replace(/^import .*;\r?$/gm, '');
    const { default: proxy } = await import('data:text/javascript;base64,' + Buffer.from('const { PUBLIC_RELEASE_APPROVED, maintenanceResponse, retiredContentResponse, clerkMiddleware } = globalThis.__minimalProxy;\n' + source).toString('base64'));
    process.env.NODE_ENV = 'production';
    for (const host of ['localhost', '127.0.0.1', 'www.cyclingcalendar.pt']) assert.equal(proxy(new Request('http://' + host + '/')).status, 200);
    assert.equal(middlewareCalls, 3);
    process.env.NODE_ENV = 'development';
    assert.equal(proxy(new Request('http://localhost/')).status, 200);
    assert.equal(proxy(new Request('http://localhost/media/events/a.png')).status, 410);
    assert.equal(proxy(new Request('https://www.cyclingcalendar.pt/')).status, 200);
    assert.equal(middlewareCalls, 5);
});
