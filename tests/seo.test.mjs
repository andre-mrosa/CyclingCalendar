import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { SITE_URL, PUBLIC_PAGES, pageMetadata, eventPageStructuredData, itemListStructuredData, filterUpcomingEvents, jsonLd } from '../app/lib/seo.js';
import { eventPath, eventIdFromSlug, DISCIPLINES, REGIONS, availableCollections } from '../app/lib/eventDiscovery.js';
import { queryPublicEvent } from '../app/lib/calendarListQuery.js';
import { PUBLIC_EVENT_SELECT } from '../app/lib/publicEvent.js';
import { getEventDiscipline } from '../app/utils/eventClassifier.js';
import { formatEventLocation } from '../app/utils/eventLocation.js';
import { eventDateDisplay } from '../app/utils/eventDateDisplay.js';
import { getCalendarDates } from '../app/utils/calendarExport.js';

test('public pages have distinct production canonicals and no unsupported coverage claims', () => {
    const urls = PUBLIC_PAGES.map(page => pageMetadata(...page).alternates.canonical);
    assert.equal(new Set(urls).size, PUBLIC_PAGES.length);
    assert.ok(urls.every(url => url.startsWith(SITE_URL + '/')));
    for (const page of PUBLIC_PAGES) assert.doesNotMatch(page.join(' '), /calendário (?:completo|oficial)|todas as provas|2026/);
});
test('event URLs round-trip problematic IDs without path separators or fragments', () => {
    const ids = ['prova-ç/#2', 'prova-ç#2', 'normal', 'á', 'a', '100% / prova? #', '🚴-2027'];
    const paths = ids.map(id => eventPath({ id, title: 'Taça de Portugal #3 / Açores' }));
    assert.equal(new Set(paths).size, ids.length);
    paths.forEach((path, i) => {
        assert.match(path, /^\/provas\/[a-z0-9-]+~[a-zA-Z0-9_-]+$/);
        assert.equal(eventIdFromSlug(path.split('/').pop()), ids[i]);
        assert.equal(new URL(path, SITE_URL).hash, '');
    });
    for (const slug of [null, '', 'a~', 'a~@@@@', 'a~a~a', 'a~_w']) assert.equal(eventIdFromSlug(slug), null);
});
test('structured data describes factual pages and never fabricates ticket or venue information', () => {
    const event = { id: 'prova-ç/#2', title: '</script><script>alert(1)</script>', date: '03 OUT 2026', tag: 'E-Sports', source: 'FPC', image: '/icon.png', prices: 'unknown' };
    const data = eventPageStructuredData(event);
    assert.equal(data['@type'], 'WebPage');
    assert.equal(data.url, SITE_URL + eventPath(event));
    for (const field of ['offers', 'performer', 'organizer', 'image', 'location', 'eventAttendanceMode', 'eventStatus']) assert.equal(data[field], undefined);
    assert.doesNotMatch(jsonLd(data), /<\/script>/);
    assert.deepEqual(JSON.parse(jsonLd(data)), data);
    const list = itemListStructuredData([event], 'Calendário');
    assert.equal(list.itemListElement[0].url, data.url);
    assert.equal(list.itemListElement[0].name, event.title);
    assert.equal(list.itemListElement[0].item, undefined);
});
test('upcoming selection retains ongoing events, sorts dates and excludes undated/past records', () => {
    const events = [
        { id: 'future', title: 'Futura', date: '31 OUT 2026', sortDate: '2026-10-31' },
        { id: 'past', title: 'Passada', date: '27 OUT 2026', sortDate: '2026-10-27' },
        { id: 'ongoing', title: 'Em curso', date: '27 OUT 2026 a 29 OUT 2026', sortDate: '2026-10-27' },
        { id: 'today', title: 'Hoje', date: '28 OUT 2026', sortDate: '2026-10-28' },
        { id: 'unknown', title: 'Sem data', date: 'Data a definir' },
    ];
    assert.deepEqual(filterUpcomingEvents(events, 40, '2026-10-28').map(e => e.id), ['ongoing', 'today', 'future']);
    assert.equal(filterUpcomingEvents(events, 1, '2026-10-28')[0].id, 'ongoing');
});
test('discovery uses explicit classifications without inferring unknown sports or venues', () => {
    const events = [{ tag: 'BTT XCO', regiao: 'AC Minho' }, { tag: 'Granfondo', regiao: 'AC Açores' }, { title: 'Gravel festival', tag: '' }];
    assert.deepEqual(availableCollections(events, DISCIPLINES).map(c => c.slug), ['btt', 'granfondos']);
    assert.deepEqual(availableCollections(events, REGIONS).map(c => c.slug), ['minho', 'acores']);
    assert.equal(DISCIPLINES.find(c => c.slug === 'estrada').match({ title: 'Unknown' }), false);
    assert.equal(REGIONS.find(c => c.slug === 'porto').match({ distrito: 'Porto' }), false);
    assert.equal(getEventDiscipline({ title: 'Prova por classificar' }), '');
    assert.equal(formatEventLocation({ details: 'Sangalhos, Anadia', distrito: 'Sangalhos, Anadia' }), 'Sangalhos, Anadia');
});
test('suspect year-long ranges stay unconfirmed and cannot be exported as race dates', () => {
    const event = { id: 'suspect', title: 'Desafio', date: '17 JUL 2027 a 18 JUL 2028', sortDate: '2027-07-17' };
    assert.equal(eventDateDisplay(event).start, undefined);
    assert.equal(getCalendarDates(event), null);
    assert.equal(filterUpcomingEvents([event], 40, '2026-10-28').length, 0);
    assert.doesNotMatch(eventPageStructuredData(event).description, /2028/);
    assert.equal(eventDateDisplay({ date: '30 DEZ 2026 a 02 JAN 2027' }).end, '2027-01-02');
});
test('event detail lookup uses the minimal projection and excludes quarantined or unsafe records', async () => {
    let calls = 0;
    const db = { event: { findFirst: async query => {
        calls++;
        assert.deepEqual(query.select, PUBLIC_EVENT_SELECT);
        assert.equal(query.where.NOT.source.contains, 'Quarentena');
        assert.equal(query.where.OR[0].source.contains, 'FPC');
        return { id: 'test', title: 'Prova', date: '31 OUT 2026', source: 'FPC', link: 'https://www.fpciclismo.pt/prova/test', description: 'PRIVATE', image: 'PRIVATE' };
    } } };
    const result = await queryPublicEvent(db, 'test', ['FPC']);
    assert.doesNotMatch(JSON.stringify(result), /PRIVATE/);
    assert.equal(await queryPublicEvent(db, '', ['FPC']), null);
    assert.equal(calls, 1);
    db.event.findFirst = async () => ({ id: 'q', title: 'Prova', source: 'FPC, Quarentena', link: 'https://www.fpciclismo.pt/prova/test' });
    assert.equal(await queryPublicEvent(db, 'q', ['FPC']), null);
    db.event.findFirst = async () => { throw new Error('database unavailable'); };
    await assert.rejects(queryPublicEvent(db, 'test', ['FPC']), /database unavailable/);
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
