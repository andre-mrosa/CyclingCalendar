import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_RELEASE_APPROVED, SOURCE_REVIEWS, assertMinimalCollectionEnabled, assertContentProcessingApproved, maintenanceResponse } from '../app/lib/contentReleasePolicy.js';
import { deepScrapeFPC } from '../app/lib/scrapers/fpc.js';
import { downloadEventAsset } from '../app/lib/scrapers/assetDownloader.js';
import { toMinimalScrapedEvent } from '../app/lib/merging/eventMerger.js';

test('public calendar is open; Stop and Go is blocked pending written permission', () => {
    assert.equal(PUBLIC_RELEASE_APPROVED, true);
    for (const source of Object.keys(SOURCE_REVIEWS)) {
        if (source === 'Stop and Go') {
            assert.throws(() => assertMinimalCollectionEnabled(source), { code: 'SOURCE_DISABLED_PENDING_PERMISSION' });
        } else {
            assert.doesNotThrow(() => assertMinimalCollectionEnabled(source));
        }
    }
    for (const source of ['unknown', undefined]) {
        assert.throws(() => assertMinimalCollectionEnabled(source), { code: 'CONTENT_RIGHTS_REVIEW_REQUIRED' });
    }
});
test('rich processing and asset entrypoints remain blocked before any network call', async t => {
    let requests = 0;
    t.mock.method(globalThis, 'fetch', async () => { requests++; throw Error('Unexpected network'); });
    assert.throws(() => assertContentProcessingApproved(), { code: 'CONTENT_RIGHTS_REVIEW_REQUIRED' });
    await assert.rejects(deepScrapeFPC('https://www.fpciclismo.pt/a'), { code: 'CONTENT_RIGHTS_REVIEW_REQUIRED' });
    await assert.rejects(downloadEventAsset('https://example.com/a.png','x'), { code: 'CONTENT_RIGHTS_REVIEW_REQUIRED' });
    assert.equal(requests, 0);
});
test('database ingestion projects records to title, date, locality, source and original source link', () => {
    const minimal = toMinimalScrapedEvent({
        id: 'race-1', title: '  Prova de Teste  ', date: '12 JUL 2026', sortDate: '2026-07-12',
        details: 'Porto | copied schedule text', source: 'FPC',
        link: 'https://www.fpciclismo.pt/prova/teste', description: 'not retained', image: 'https://www.fpciclismo.pt/poster.jpg',
    });
    assert.deepEqual(Object.keys(minimal).sort(), ['date', 'details', 'distrito', 'id', 'link', 'regiao', 'sortDate', 'source', 'title'].sort());
    assert.equal(minimal.title, 'Prova de Teste');
    assert.equal(minimal.details, 'Porto');
    assert.equal(minimal.link, 'https://www.fpciclismo.pt/prova/teste');
    assert.equal(toMinimalScrapedEvent({ id: 'stopped-source', title: 'Prova', date: '12 JUL 2026', sortDate: '2026-07-12', details: 'Porto', source: 'Stop and Go', link: 'https://stopandgo.net/events/teste' }), null);
    assert.equal(toMinimalScrapedEvent({
        id: 'unsafe-link', title: 'Prova', date: '12 JUL 2026', sortDate: '2026-07-12',
        details: 'Porto', source: 'FPC', link: 'https://registration.example/event',
    }), null);
});
test('maintenance response prevents caching/indexing when explicitly used', async () => {
    for (const path of ['/', '/api/events', '/sitemap.xml', '/media/events/a.png', '/events/a', '/api/calendar/feed/a/token']) {
        const r = maintenanceResponse('https://site.test' + path);
        assert.equal(r.status, 503);
        assert.match(r.headers.get('cache-control'), /no-store/);
        assert.match(r.headers.get('x-robots-tag'), /noindex/);
        assert.match(await r.text(), /temporariamente indisponível/);
    }
    const worker = maintenanceResponse('https://site.test/sw.js');
    assert.equal(worker.status, 200);
    assert.match(worker.headers.get('content-type'), /javascript/);
    assert.match(await worker.text(), /caches.delete/);
});
