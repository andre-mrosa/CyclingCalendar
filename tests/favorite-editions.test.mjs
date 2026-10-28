import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { editionIdentity, editionMatches, planFavoriteEditions, effectiveEditionIds, editionFeedEvents } from '../app/utils/favoriteEditions.js';
import { processFavoriteEditions, editionAlertEmail } from '../app/lib/sendEditionAlerts.js';
import { favoriteEditionSettings, editionEmailAvailable } from '../app/lib/favoriteEditionSettings.js';
import { verifiedEmail } from '../app/utils/favoriteAlerts.js';

const race = (year, extra = {}) => ({ id: 'race-' + year, title: 'Granfondo Médio Tejo ' + year,
    date: '23 MAI ' + year, sortDate: year + '-05-23', tag: 'Granfondo', source: 'FPC',
    distrito: year === 2026 ? 'Ferreira do Zêzere' : 'Tomar', link: 'https://www.fpciclismo.pt/prova/granfondo-medio-tejo-' + year, ...extra });
const first = race(2026);
const second = race(2027, { id: 'cabreira-granfondo-medio-tejo-2-2027', title: 'Granfondo Medio Tejo 2',
    source: 'Cabreira, Stop and Go', link: 'https://cabreirasolutions.com/evento/granfondo-medio-tejo-2/' });
const third = race(2028);
const user = { id: 'user_fixture', unsafeMetadata: { favorites: [first.id] }, primaryEmailAddressId: 'primary',
    emailAddresses: [{ id: 'primary', emailAddress: 'test@example.test', verification: { status: 'verified' } }] };

test('automatic source aliases create only one calendar entry and preserve existing manual identities',()=>{
    const alias = {...second,id:'other-source'};
    assert.deepEqual(editionFeedEvents([second,alias],[]).map(event=>event.id),[second.id]);
    assert.deepEqual(editionFeedEvents([second,alias],[alias.id]).map(event=>event.id),[alias.id]);
    assert.deepEqual(editionFeedEvents([first,second,alias],[first.id]).map(event=>event.id),[first.id,second.id]);
});

test('the actual Médio Tejo 2026 and 2027 source formats match across accents, names and towns', () => {
    const matches = editionMatches([first, second], [first.id]);
    assert.equal(matches.length, 1);
    assert.equal(matches[0].event.id, second.id);
    assert.equal(editionIdentity(first).series, editionIdentity(second).series);
});
test('following is global and opt-in; manual stars remain and discoveries survive disabling', () => {
    assert.deepEqual(effectiveEditionIds([first, second], [first.id], [], {}, false), []);
    const initial = planFavoriteEditions([first, second], [first.id], [], {}, { baseline: true });
    assert.deepEqual(initial.state.addedIds, [second.id]);
    assert.deepEqual(effectiveEditionIds([first, second], [first.id], [], initial.state, false), [second.id]);
    assert.equal(favoriteEditionSettings(null, [first, second], user, false).follow, false);
});
test('similar names, cup rounds, disciplines and ambiguous dates never carry favorites automatically', () => {
    assert.equal(editionMatches([first, race(2027, { title: 'Granfondo Médio Mondego' })], [first.id]).length, 0);
    assert.equal(editionMatches([first, race(2027, { tag: 'BTT XCO' })], [first.id]).length, 0);
    const cup = race(2026, { title: '1ª Taça de Portugal XCO - Melgaço', tag: 'BTT XCO' });
    assert.equal(editionMatches([cup, race(2027, { title: '2ª Taça de Portugal XCO - Melgaço', tag: 'BTT XCO' })], [cup.id]).length, 0);
    assert.equal(editionMatches([first, second, race(2027, { id: 'other-date', date: '30 MAI 2027' })], [first.id]).length, 0);
    for (const extra of [{ title: 'Granfondo' }, { date: 'Data a definir' }, { tag: '' }, { source: 'Quarentena' }, { title: 'Granfondo Médio Tejo cancelado' }])
        assert.equal(editionIdentity(race(2027, extra)), null);
});
test('unstarred automatic editions are excluded across sources; categories and numbered formats stay distinct', () => {
    const key = editionIdentity(second).key;
    const alias = { ...second, id: 'another-source' };
    assert.equal(editionMatches([first, second, alias], [first.id], [key]).length, 0);
    assert.deepEqual(effectiveEditionIds([first, second], [first.id], [key], { addedIds: [second.id] }, false), []);
    const merged = { ...second, _allIds: [second.id, 'another-source'] };
    assert.deepEqual(effectiveEditionIds([first, merged], [first.id], [key], { addedIds: [second.id, 'another-source'] }, false), []);
    assert.notEqual(editionIdentity(race(2027, { title: 'Granfondo Médio Tejo Kids' })).series, editionIdentity(first).series);
    assert.notEqual(editionIdentity(race(2027, { title: 'Granfondo Médio Tejo 100 km' })).series, editionIdentity(first).series);
});

test('saving global preferences establishes a baseline and retains editions when following is disabled', async () => {
    let row = null;
    const deps = { auth: async () => ({ userId: user.id }), clerkClient: async () => ({ users: { getUser: async id => { assert.equal(id,user.id); return user; } } }),
        prisma: { favoriteEditionPreference: { findUnique: async ({where}) => { assert.equal(where.userId,user.id); return row; },
            create: async ({data}) => (row = {...data,updatedAt:new Date('2026-10-28')}),
            updateMany: async ({data}) => { Object.assign(row,data); return {count:1}; } } },
        Prisma: { DbNull: null }, getPublicCalendarEvents: async () => [first,second],
        favoriteEditionSettings, editionEmailAvailable: () => false, planFavoriteEditions,
        safeFavoriteIds: value => value || [], verifiedEmail };
    const key = 'editionSaveFixture'; globalThis[key] = deps;
    const source = (await readFile(new URL('../app/api/favorites/editions/route.js', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
    try {
        const route = await import('data:text/javascript;base64,' + Buffer.from(`const {${Object.keys(deps)}} = globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64'));
        const request = follow => new Request('https://calendar.test/api/favorites/editions', {method:'PUT',headers:{origin:'https://calendar.test'},body:JSON.stringify({follow,email:false,language:'pt'})});
        const enabled = await route.PUT(request(true)); assert.equal(enabled.status,200);
        assert.equal((await enabled.json()).follow,true);
        assert.deepEqual(row.state.addedIds,[second.id]); assert.ok(row.state.seenKeys.includes(editionIdentity(second).key));
        const disabled = await route.PUT(request(false)); assert.equal(disabled.status,200);
        const saved = await disabled.json(); assert.equal(saved.follow,false); assert.equal(saved.email,false);
        assert.deepEqual(saved.inheritedIds,[second.id]);
    } finally { delete globalThis[key]; }
});
test('enabling emails establishes a baseline, then alerts only once for a newly discovered edition', () => {
    const baseline = planFavoriteEditions([first, second], [first.id], [], {}, { baseline: true });
    assert.equal(baseline.notices.length, 0);
    const next = planFavoriteEditions([first, second, third], [first.id], [], baseline.state);
    assert.equal(next.notices.length, 1);
    assert.equal(next.notices[0].year, 2028);
    assert.equal(planFavoriteEditions([first, second, third], [first.id], [], next.state).notices.length, 0);
    assert.equal(planFavoriteEditions([first, second, third], [first.id], [], next.deferredState).notices.length, 1);
    const other = race(2029, { id: 'other', title: 'Granfondo de Coimbra' });
    assert.equal(planFavoriteEditions([first, second, third, other], [first.id, other.id], [], next.state).notices.length, 0);
});
test('email notices link to factual event pages, include preference management and contain no invented prices', () => {
    const notice = editionMatches([first, second], [first.id]);
    for (const language of ['pt','en','es','fr']) {
        const email = editionAlertEmail(notice, language);
        assert.match(email.text, /https:\/\/www.cyclingcalendar.pt\/provas\//);
        assert.match(email.text, /https:\/\/www.cyclingcalendar.pt\/favoritos/);
        assert.doesNotMatch(email.text, /0 €|InStock|\/events\//);
    }
});
function fixture() {
    let row = { userId: user.id, follow: true, email: true, language: 'pt', state:
        planFavoriteEditions([first, second], [first.id], [], {}, { baseline: true }).state,
        pending: null, lastSentAt: null, leaseUntil: null };
    const writes = [];
    const db = { favoriteEditionPreference: {
        findUnique: async () => ({ ...row }),
        update: async ({ data }) => { Object.assign(row, data); return row; },
        updateMany: async ({ data }) => { Object.assign(row, data); return { count: 1 }; },
        deleteMany: async () => ({ count: 1 }),
    } };
    const now = new Date('2026-10-28T04:00:00Z');
    return { db, writes, row: () => row, options: { db, users: { getUser: async () => user }, events: [first,second,third],
        row, jsonNull: null, now, emailAvailable: true,
        send: async (message, key) => { writes.push({ message, key }); return { data: { id: 'mock-id' } }; } } };
}
test('delivery failures retain one persisted message and idempotency key; retry never duplicates successful mail', async () => {
    const f = fixture();
    let attempts = 0;
    f.options.send = async (message, key) => { f.writes.push({ message, key }); return ++attempts === 1 ? { error: 'timeout' } : { data: { id: 'mock-id' } }; };
    await assert.rejects(processFavoriteEditions(f.options), /delivery failed/);
    assert.ok(f.row().pending);
    assert.equal(f.row().leaseUntil, null);
    assert.equal(await processFavoriteEditions({ ...f.options, row: f.row() }), 'sent');
    assert.deepEqual(f.writes[0], f.writes[1]);
    assert.equal(await processFavoriteEditions({ ...f.options, row: f.row() }), 'unchanged');
    assert.equal(f.writes.length, 2);
});
test('no opt-in, unverified addresses and missing sender configuration never send email', async () => {
    for (const mode of ['disabled','unverified','unconfigured']) {
        const f = fixture();
        if (mode === 'disabled') f.row().email = false;
        if (mode === 'unverified') f.options.users = { getUser: async () => ({ ...user, emailAddresses: [] }) };
        if (mode === 'unconfigured') f.options.emailAvailable = false;
        await processFavoriteEditions(f.options);
        assert.equal(f.writes.length, 0);
        assert.equal(f.row().leaseUntil, null);
    }
});
test('daily limits defer fresh editions and uncertain messages older than the provider window need review', async () => {
    const f = fixture();
    f.row().lastSentAt = new Date('2026-10-28T01:00:00Z');
    assert.equal(await processFavoriteEditions(f.options), 'limited');
    assert.equal(f.writes.length, 0);
    f.row().lastSentAt = null;
    f.options.send = async () => ({ error: 'timeout' });
    await assert.rejects(processFavoriteEditions(f.options));
    const pending = f.row().pending;
    assert.equal(await processFavoriteEditions({ ...f.options, row: f.row(), now: new Date('2026-10-29T04:00:00Z') }), 'needs-review');
    assert.equal(f.row().pending.id, pending.id);
});
test('edition preferences require an authenticated owner, same origin and explicit boolean consent', async () => {
    let userId = null;
    const deps = { auth: async () => ({ userId }), clerkClient: () => assert.fail('Unexpected Clerk lookup'),
        prisma: {}, Prisma: {}, getPublicCalendarEvents: () => [], favoriteEditionSettings, editionEmailAvailable: () => false,
        planFavoriteEditions, safeFavoriteIds: value => value, verifiedEmail };
    const key = 'editionRouteFixture';
    globalThis[key] = deps;
    const source = (await readFile(new URL('../app/api/favorites/editions/route.js', import.meta.url), 'utf8')).replace(/^import .*;\r?$/gm, '');
    try {
        const route = await import('data:text/javascript;base64,' + Buffer.from(`const {${Object.keys(deps)}} = globalThis[${JSON.stringify(key)}];\n${source}`).toString('base64'));
        const req = (origin, body) => new Request('https://calendar.test/api/favorites/editions', { method:'PUT', headers:{origin}, body:JSON.stringify(body) });
        assert.equal((await route.GET()).status, 401);
        userId = 'user_owner';
        assert.equal((await route.PUT(req('https://evil.test',{}))).status, 403);
        assert.equal((await route.PUT(req('https://calendar.test',{follow:'yes',email:false}))).status,400);
        assert.equal((await route.PUT(req('https://calendar.test',{follow:false,email:true}))).status,400);
        assert.equal((await route.PUT(req('https://calendar.test',{follow:true,email:true}))).status,503);
    } finally { delete globalThis[key]; }
});
