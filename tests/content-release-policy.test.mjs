import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_RELEASE_APPROVED, SOURCE_REVIEWS, assertMinimalCollectionEnabled, maintenanceResponse } from '../app/lib/contentReleasePolicy.js';
import { toMinimalScrapedEvent } from '../app/lib/merging/eventMerger.js';

test('configured sources are enabled for minimal collection; unknown sources are rejected', () => {
    assert.equal(PUBLIC_RELEASE_APPROVED, true);
    for (const source of Object.keys(SOURCE_REVIEWS)) {
        assert.equal(SOURCE_REVIEWS[source], 'approved-minimal');
        assert.doesNotThrow(() => assertMinimalCollectionEnabled(source));
    }
    for (const source of ['unknown', undefined, 'Classificações.net']) {
        assert.throws(() => assertMinimalCollectionEnabled(source), { code: 'CONTENT_RIGHTS_REVIEW_REQUIRED' });
    }
});
test('ingestion keeps basic facts and source links without descriptions, images or programmes', () => {
    const event = {
        id: 'race-1', title: '  Prova de Teste  ', date: '12 JUL 2026', sortDate: '2026-07-12',
        details: 'Porto | PRIVATE_SCHEDULE', source: 'FPC',
        link: 'https://www.fpciclismo.pt/prova/teste', description: 'PRIVATE_DESCRIPTION',
        image: 'https://www.fpciclismo.pt/PRIVATE_POSTER.jpg', programa: 'PRIVATE_PROGRAMME',
    };
    const minimal = toMinimalScrapedEvent(event);
    assert.deepEqual(Object.keys(minimal).sort(), ['date', 'details', 'distrito', 'id', 'link', 'regiao', 'sortDate', 'source', 'title'].sort());
    assert.equal(minimal.title, 'Prova de Teste');
    assert.equal(minimal.details, 'Porto');
    assert.doesNotMatch(JSON.stringify(minimal), /PRIVATE/);
    assert.equal(toMinimalScrapedEvent({ ...event, source: 'unknown' }), null);
    assert.equal(toMinimalScrapedEvent({ ...event, source: 'Classificações.net' }), null);
    assert.equal(toMinimalScrapedEvent({ ...event, source: 'Stop and Go', link: 'https://stopandgo.net/events/teste' }).source, 'Stop and Go');
    assert.equal(toMinimalScrapedEvent({ ...event, link: 'https://registration.example/event' }), null);
});
test('maintenance response prevents caching/indexing when explicitly used', async () => {
    for (const path of ['/', '/api/events', '/sitemap.xml', '/media/events/a.png', '/events/a', '/api/calendar/feed/a/token']) {
        const response = maintenanceResponse('https://site.test' + path);
        assert.equal(response.status, 503);
        assert.match(response.headers.get('cache-control'), /no-store/);
        assert.match(response.headers.get('x-robots-tag'), /noindex/);
        assert.match(await response.text(), /temporariamente indisponível/);
    }
    const worker = maintenanceResponse('https://site.test/sw.js');
    assert.equal(worker.status, 200);
    assert.match(worker.headers.get('content-type'), /javascript/);
    assert.match(await worker.text(), /caches.delete/);
});
