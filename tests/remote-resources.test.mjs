import test from 'node:test';
import assert from 'node:assert/strict';
import { publicAddress, resolvePublicUrl, rasterImageType } from '../app/lib/safeRemote.js';
import { sanitizeRichHtml } from '../app/lib/sanitizeHtml.js';
import { parseListQuery, queryCalendarList } from '../app/lib/calendarListQuery.js';
import { buildListSummary } from '../app/lib/calendarSummary.js';

test('remote resources reject private, loopback, mapped and mixed DNS answers', async () => {
    for (const ip of ['127.0.0.1', '10.1.2.3', '172.16.0.1', '192.168.0.1', '169.254.169.254', '0.0.0.0', '::1', '::ffff:127.0.0.1', 'fc00::1', 'fe80::1']) assert.equal(publicAddress(ip), false, ip);
    assert.equal(publicAddress('8.8.8.8'), true);
    for (const url of ['http://127.0.0.1/x', 'http://2130706433/x', 'http://[::1]/x', 'file:///etc/passwd', 'https://user:pass@example.com/', 'https://example.com:8443/']) await assert.rejects(resolvePublicUrl(url));
    await assert.rejects(resolvePublicUrl('https://example.com/', async () => [{address:'8.8.8.8',family:4},{address:'127.0.0.1',family:4}]));
    assert.equal((await resolvePublicUrl('https://example.com/', async () => [{address:'8.8.8.8',family:4}])).address.address, '8.8.8.8');
});

test('image signatures reject HTML and SVG; rich text rejects active content', () => {
    assert.equal(rasterImageType(Buffer.from('<html>test</html>')), null);
    assert.equal(rasterImageType(Buffer.from('<svg onload="alert(1)"></svg>')), null);
    assert.equal(rasterImageType(Buffer.from([137,80,78,71,13,10,26,10])), 'image/png');
    const html = sanitizeRichHtml('<p>Safe</p><script>alert(1)</script><img src=x onerror=alert(1)><a href="java&#9;script:alert(1)">link</a>');
    assert.match(html, /<p>Safe<\/p>/);
    assert.doesNotMatch(html, /onerror|javascript|<script/i);
});

test('years reject malformed and unbounded inputs before database access', () => {
    for (const year of ['999999999999999', '2026oops', 'NaN', '0000', '2026,,2027']) assert.throws(() => parseListQuery(new URLSearchParams({year})));
    assert.deepEqual(parseListQuery(new URLSearchParams({years:'2027,2026,2026'})), ['2026','2027']);
    assert.deepEqual(parseListQuery(new URLSearchParams({years:'all'})), []);
});

test('cached list summaries preserve registration/locality without reading HTML', async () => {
    const event = {id:'one',title:'Prova',details:'Estoi | BTT',distrito:'Faro',source:'FPC',prices:'Abertura das inscrições dia 01/09/2026',programa:''};
    const summary = buildListSummary(event);
    let queries = 0;
    const rows = await queryCalendarList({event:{findMany:async args=>{
        queries++; assert.equal(args.select.programa,undefined);assert.equal(args.select.prices,undefined);
        return [{id:event.id,title:event.title,source:'FPC',listSummary:summary}];
    }}}, [], ['FPC']);
    assert.equal(queries,1);
    assert.equal(rows[0].locationInfo.locality,'Estoi');
    assert.equal(rows[0].registrationOpensAt,'2026-09-01T00:00:00.000Z');
    assert.equal(rows[0].listSummary,undefined);
});
