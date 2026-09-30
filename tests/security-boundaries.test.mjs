import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { sanitizeHtml } from '../app/lib/scrapers/utils.js';
import { GET as downloadTrack } from '../app/api/download-track/route.js';

test('GPX download rejects traversal outside public media (harmless package.json probe)', async () => {
    const response = await downloadTrack(new Request('http://calendar.test/api/download-track?url=' + encodeURIComponent('/media/events/../../../package.json')));
    assert.ok(response.status >= 400, `Expected rejection, received HTTP ${response.status}`);
});

test('HTML sanitizer never restores an input removed entirely by sanitization', () => {
    const result = sanitizeHtml('<img src=x onerror=alert(1)>');
    assert.equal(result, '');
});

test('HTML sanitizer removes script URLs with embedded ASCII whitespace', () => {
    const result = sanitizeHtml('<a href="java&#x09;script:alert(1)">link</a>');
    assert.doesNotMatch(result.replace(/[\t\r\n]/g, ''), /javascript:/i);
});

test('retired programme requests cannot fetch or overwrite events', async t => {
 let calls = 0;
 t.mock.method(globalThis, 'fetch', () => { calls++; throw Error('Unexpected network'); });
 const { GET } = await import('../app/api/programa/route.js');
 const response = await GET(new Request('http://calendar.test/api/programa?url=https://fpciclismo.pt/other-event&id=unrelated-event'));
 assert.equal(response.status, 410);
 assert.equal(calls, 0);
});
