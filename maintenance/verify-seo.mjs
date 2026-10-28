// Read-only audit: public GET requests only. No forms, calendars or account changes.
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { PUBLIC_PAGES, SITE_URL } from '../app/lib/seo.js';
import { eventPath, eventIdFromSlug, DISCIPLINES, REGIONS, availableCollections } from '../app/lib/eventDiscovery.js';
const base = process.env.SEO_TEST_URL || 'http://localhost:3102';
const headers = { 'User-Agent': 'Googlebot' };
const get = (path, options = {}) => fetch(base + path, { headers, signal: AbortSignal.timeout(30000), ...options });
const checked = [];
function assertSchemas($, path) {
    for (const element of $('script[type="application/ld+json"]').toArray()) {
        const data = JSON.parse($(element).html());
        const text = JSON.stringify(data);
        assert.doesNotMatch(text, /"@type":"(?:SportsEvent|Offer|PerformingGroup|FAQPage)"|"(?:offers|performer|eventAttendanceMode|eventStatus)":/, path + ' unsupported schema');
    }
}
async function checkPage(path, title) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    const $ = load(await response.text());
    if (title) assert.equal($('title').text(), title, path + ' title');
    assert.ok($('title').text(), path + ' title');
    assert.equal(new URL($('link[rel=canonical]').attr('href')).href, new URL(SITE_URL + path).href, path + ' canonical');
    assert.ok($('meta[name=description]').attr('content'), path + ' description');
    assert.equal($('h1').length, 1, path + ' heading');
    assertSchemas($, path);
    if (path === '/') {
        assert.match($('h1').text(), /Calendário de provas de ciclismo/);
        assert.ok($('h3 a[href^="/provas/"]').length, 'Event links must be present without executing JavaScript');
    }
    checked.push({ path, status: response.status });
    return $;
}
for (const [path, title] of PUBLIC_PAGES) await checkPage(path, title);
const api = await get('/api/events?years=all');
assert.equal(api.status, 200);
const catalogue = await api.json();
assert.equal(catalogue.success, true);
const events = catalogue.events;
assert.ok(events.length, 'Cannot validate discovery against an empty catalogue');
const publicIds = new Map(events.map(event => [event.id, event]));
const xmlResponse = await get('/sitemap.xml');
assert.equal(xmlResponse.status, 200);
const xml = load(await xmlResponse.text(), { xmlMode: true });
const urls = xml('loc').map((_, element) => xml(element).text()).get();
assert.equal(new Set(urls).size, urls.length, 'Duplicate sitemap URLs');
assert.ok(urls.every(url => url.startsWith(SITE_URL + '/')));
assert.ok(!urls.some(url => /\/(?:admin|api|events)\//.test(url)), 'No private or redirected URLs');
const eventUrls = urls.filter(url => url.includes('/provas/'));
assert.equal(eventUrls.length, new Set(events.map(eventPath)).size);
for (const url of eventUrls) {
    const slug = new URL(url).pathname.split('/').pop();
    const event = publicIds.get(eventIdFromSlug(slug));
    assert.ok(event, url + ' must resolve to a public event');
    assert.equal(url, SITE_URL + eventPath(event));
}
for (const [kind, collections] of [['modalidades', DISCIPLINES], ['regioes', REGIONS]]) {
    for (const item of collections) {
        const path = '/' + kind + '/' + item.slug;
        const available = availableCollections(events, [item]).length > 0;
        assert.equal(urls.includes(SITE_URL + path), available, path + ' sitemap availability');
        const $ = await checkPage(path);
        if (available) assert.ok($('h3 a[href^="/provas/"]').length, path + ' server-rendered events');
        else assert.match($('meta[name=robots]').attr('content') || '', /noindex/, path);
    }
}
const home = await checkPage('/');
const visible = home('h3 a[href^="/provas/"]').map((_, el) => home(el).attr('href')).get();
const special = events.filter(event => /[#/%ç]/i.test(event.id)).slice(0, 8).map(eventPath);
const sample = [...new Set([...visible, ...special, ...eventUrls.filter((_, i) => i % Math.max(1, Math.floor(eventUrls.length / 8)) === 0).map(url => new URL(url).pathname)])];
for (const path of sample) {
    const $ = await checkPage(path);
    assert.ok($('script[type="application/ld+json"]').toArray().some(el => JSON.parse($(el).html())['@type'] === 'WebPage'), path);
}
for (const first of [events[0], events.find(event => event.id.includes('#')), events.find(event => event.id.includes('/'))].filter(Boolean)) {
    const legacy = await get('/events/' + encodeURIComponent(first.id), { redirect: 'manual' });
    assert.equal(legacy.status, 308, 'Legacy event URL: ' + first.id);
    assert.ok(legacy.headers.get('location').endsWith(eventPath(first)));
}
const page2 = await checkPage('/modalidades/btt?pagina=2');
assert.ok(page2('a[rel="prev"]').length);
const suspectDate = events.find(event => event.date === '17 JUL 2027 a 18 JUL 2028');
if (suspectDate) {
    const $ = await checkPage(eventPath(suspectDate));
    assert.match($('article').text(), /Data por confirmar na fonte/);
    assert.equal($('article time').length, 0);
    assert.doesNotMatch($('meta[name=description]').attr('content'), /2028/);
}
for (const path of ['/provas/invalid', '/provas/invalid~bm9uZXhpc3RlbnQ', '/modalidades/unknown', '/regioes/unknown', '/modalidades/btt?pagina=9999']) {
    const response = await get(path);
    assert.equal(response.status, 404, path);
}
for (const [path, destination] of [['/termos', '/terms-of-service'], ['/privacidade', '/privacy-policy']]) {
    const response = await get(path, { redirect: 'manual' });
    assert.equal(response.status, 308, path);
    assert.ok(response.headers.get('location').endsWith(destination));
}
for (const path of ['/agenda', '/favoritos', '/definicoes', '/admin', '/sign-in', '/sign-up']) {
    const response = await get(path);
    const $ = load(await response.text());
    assert.equal(response.status, 200, path);
    assert.match($('meta[name=robots]').attr('content') || '', /noindex/, path);
}
const robotsResponse = await get('/robots.txt');
assert.equal(robotsResponse.status, 200);
assert.ok((await robotsResponse.text()).includes('Sitemap: ' + SITE_URL + '/sitemap.xml'));
for (const path of ['/favicon.ico', '/icon.png', '/apple-icon.png', '/icon-192x192.png', '/icon-512x512.png', '/brand-maskable.png']) {
    const response = await get(path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /image\//);
}
console.log(JSON.stringify({ checkedPages: checked.length, testedEventPages: sample.length, sitemapEntries: urls.length,
    verifiedEventURLs: eventUrls.length, publicEventLinks: visible.length, schemas: 'factual, parseable',
    redirects: 'passed', missingPages: '404', privatePages: 'noindex' }, null, 2));
