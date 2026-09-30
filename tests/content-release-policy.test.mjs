import test from 'node:test';
import assert from 'node:assert/strict';
import { PUBLIC_RELEASE_APPROVED, SOURCE_REVIEWS, assertSourceApproved, maintenanceResponse } from '../app/lib/contentReleasePolicy.js';
import { fetchFPCCalendar, deepScrapeFPC } from '../app/lib/scrapers/fpc.js';
import { scrapeEventPage } from '../app/lib/scrapers/stopandgo.js';
import { downloadEventAsset } from '../app/lib/scrapers/assetDownloader.js';

test('release is held and every current or unknown source is denied', () => {
    assert.equal(PUBLIC_RELEASE_APPROVED, false);
    for (const source of [...Object.keys(SOURCE_REVIEWS), 'unknown', undefined]) {
        assert.throws(() => assertSourceApproved(source), { code: 'CONTENT_RIGHTS_REVIEW_REQUIRED' });
    }
});
test('manual calendar, detail and asset entrypoints fail before any network call', async t => {
    let requests = 0;
    t.mock.method(globalThis, 'fetch', async () => { requests++; throw Error('Unexpected network'); });
    for (const run of [() => fetchFPCCalendar(2026), () => deepScrapeFPC('https://www.fpciclismo.pt/a'), () => scrapeEventPage('https://stopandgo.net/events/a'), () => downloadEventAsset('https://example.com/a.png','x')]) {
        await assert.rejects(run, { code: 'CONTENT_RIGHTS_REVIEW_REQUIRED' });
    }
    assert.equal(requests, 0);
});
test('hold returns no event content and prevents caching/indexing, including direct assets', async () => {
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
