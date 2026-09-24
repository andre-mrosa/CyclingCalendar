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

test('anonymous programa request cannot overwrite an arbitrary event (mock database)', async () => {
    const writes = [];
    const deps = {
        NextResponse: { json: (body, init) => Response.json(body, init) },
        prisma: { event: { findFirst: async () => ({ programa: '<p>Stored program</p>' }), update: async args => { writes.push(args); } } },
        sanitizeRichHtml: value => value,
        deepScrapeFPC: async () => '<p>Program of another event</p>',
        deepScrapeCabreira: async () => null,
    };
    globalThis.__securityAuditProgram = deps;
    try {
        const source = (await readFile(new URL('../app/api/programa/route.js', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
        const routeModule = await import('data:text/javascript;base64,' + Buffer.from('const { NextResponse, prisma, deepScrapeFPC, deepScrapeCabreira, sanitizeRichHtml } = globalThis.__securityAuditProgram;\n' + source).toString('base64'));
        await routeModule.GET(new Request('http://calendar.test/api/programa?url=https://fpciclismo.pt/other-event&id=unrelated-event'));
        assert.equal(writes.length, 0, 'Unauthenticated GET wrote to the supplied event ID');
    } finally {
        delete globalThis.__securityAuditProgram;
    }
});
