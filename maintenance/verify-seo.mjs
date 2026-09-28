// Read-only HTTP audit; never submits the contact form or changes external accounts.
import assert from 'node:assert/strict';
import { load } from 'cheerio';
import { PUBLIC_PAGES, SITE_URL } from '../app/lib/seo.js';
const base = process.env.SEO_TEST_URL || 'http://localhost:3102';
const results = [];
for (const [path, title] of PUBLIC_PAGES) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const $ = load(await response.text());
    assert.equal($('title').text(), title, path + ' title');
    assert.equal(new URL($('link[rel=canonical]').attr('href')).href, SITE_URL + path, path + ' canonical');
    assert.ok($('meta[name=description]').attr('content'), path + ' description');
    assert.equal($('h1').length, 1, path + ' heading');
    assert.doesNotMatch($.text(), /andre\.[a-z0-9.]+@(?:outlook|gmail)\.com/i, 'No personal email exposed');
    results.push({ path, status: response.status, canonical: $('link[rel=canonical]').attr('href') });
}
for (const [path, destination] of [['/termos', '/terms-of-service'], ['/privacidade', '/privacy-policy']]) {
    const response = await fetch(base + path, { redirect: 'manual' });
    assert.equal(response.status, 308, path);
    assert.ok(response.headers.get('location').endsWith(destination));
}
for (const path of ['/agenda', '/favoritos', '/definicoes', '/admin', '/sign-in', '/sign-up']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    const $ = load(await response.text());
    assert.match($('meta[name=robots]').attr('content') || '', /noindex/, path);
}
const robots = await (await fetch(base + '/robots.txt')).text();
assert.ok(robots.includes('Sitemap: ' + SITE_URL + '/sitemap.xml'));
const xml = load(await (await fetch(base + '/sitemap.xml')).text(), { xmlMode: true });
const urls = xml('loc').map((_, element) => xml(element).text()).get();
assert.ok(urls.length > PUBLIC_PAGES.length);
assert.ok(urls.every(url => url.startsWith(SITE_URL + '/')));
assert.equal(new Set(urls).size, urls.length);
for (const url of urls.filter(url => url.includes('/events/')).slice(0, 3)) {
    const response = await fetch(base + new URL(url).pathname);
    assert.equal(response.status, 200, url);
    const $ = load(await response.text());
    assert.equal($('link[rel=canonical]').attr('href'), url);
    assert.ok($('meta[property="og:url"]').attr('content'));
}
for (const path of ['/favicon.ico', '/icon.png', '/apple-icon.png', '/icon-192x192.png', '/icon-512x512.png', '/brand-maskable.png']) {
    const response = await fetch(base + path);
    assert.equal(response.status, 200, path);
    assert.match(response.headers.get('content-type'), /image\//);
}
const manifest = await (await fetch(base + '/manifest.json')).json();
assert.ok(manifest.icons.some(icon => icon.purpose === 'maskable'));
console.log(JSON.stringify({ publicPages: results, sitemapEntries: urls.length, redirects: 'passed', privatePagesNoindex: 'passed', icons: 'passed' }, null, 2));
