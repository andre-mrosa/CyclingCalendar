import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SITE_URL, PUBLIC_PAGES, pageMetadata, eventStructuredData, jsonLd, publicImage } from '../app/lib/seo.js';

test('public pages have distinct canonicals on the production hostname', () => {
    const urls = PUBLIC_PAGES.map(page => pageMetadata(...page).alternates.canonical);
    assert.equal(new Set(urls).size, PUBLIC_PAGES.length);
    assert.ok(urls.every(url => url.startsWith(SITE_URL + '/')));
    assert.ok(!urls.some(url => /admin|agenda|favoritos/.test(url)));
});
test('event structured data preserves dates and escapes script termination', () => {
    const event = { id: 'prova-ç/#2', title: '</script><script>alert(1)</script>', date: '03 OUT 2026 a 04 OUT 2026', sortDate: '2026-10-03', details: 'Porto', image: 'data:image/png;base64,abcd' };
    const data = eventStructuredData(event);
    assert.equal(data.startDate, '2026-10-03');
    assert.equal(data.endDate, '2026-10-04');
    assert.ok(data.url.endsWith(encodeURIComponent(event.id)));
    assert.equal(data.image, undefined);
    assert.doesNotMatch(jsonLd(data), /<\/script>/);
    assert.deepEqual(JSON.parse(jsonLd(data)), data);
    assert.equal(eventStructuredData({ ...event, date: 'Data a definir' }), null);
});
test('social images only use public HTTP URLs', () => {
    assert.equal(publicImage('data:image/png;base64,a'), null);
    assert.equal(publicImage('/media/events/image.png'), null);
    assert.equal(publicImage('javascript:alert(1)'), null);
});
test('favicon has useful browser and search sizes', () => {
    const ico = readFileSync(new URL('../app/favicon.ico', import.meta.url));
    assert.equal(ico.readUInt16LE(2), 1);
    const sizes = Array.from({ length: ico.readUInt16LE(4) }, (_, i) => ico[6 + i * 16] || 256);
    assert.deepEqual(sizes, [16, 32, 48, 64]);
});
test('privacy identifies the controller only there and directs requests to the form', () => {
    const policy = readFileSync(new URL('../app/privacy-policy/page.js', import.meta.url), 'utf8');
    assert.match(policy, /responsável pelo tratamento/);
    assert.match(policy, /href="\/contacto"/);
    assert.doesNotMatch(policy, /mailto:|@outlook|@gmail|Supabase/);
});
