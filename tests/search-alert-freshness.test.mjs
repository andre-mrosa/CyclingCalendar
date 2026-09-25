import test from 'node:test';
import assert from 'node:assert/strict';
import { decodeSearch, normalizeSearch, searchUrl } from '../app/utils/savedSearches.js';
import { registrationStatus } from '../app/utils/eventFreshness.js';
import { planFavoriteAlerts, verifiedEmail, alertEmail } from '../app/utils/favoriteAlerts.js';
import { deliverFavoriteAlert } from '../app/lib/sendFavoriteAlerts.js';
import { readFile } from 'node:fs/promises';
import { saveOrMergeEvent, mergeEventRecords } from '../app/lib/merging/eventMerger.js';

const now = new Date('2026-09-25T10:00:00Z');
const event = { id: 'race', title: 'Prova BTT', date: '27 SET 2026', sortDate: '2026-09-27T00:00:00Z', registrationClosesAt: '2026-09-27T18:00:00.000Z' };
test('shared searches preserve accented text, scope, distance origin and all recognised filters', () => {
    const filters = { searchTerm: 'São João & BTT', selectedYears: ['2026'], selectedTags: ['BTT'], selectedEscaloes: ['Elite'], selectedDistrito: 'Porto', monthFrom: 2, monthTo: 9, viewMode: 'calendar', selectedMonth: '2026-09', selectedDay: '2026-09-27', maxDistanceFilter: 100, origin: { lat: 41.1, lng: -8.6 }, sources: ['FPC'], private: 'ignored' };
    const url = new URL(searchUrl('https://example.test/regionais?event=old&lang=pt', filters));
    assert.equal(url.pathname, '/regionais'); assert.equal(url.searchParams.get('lang'), 'pt'); assert.equal(url.searchParams.has('event'), false);
    assert.deepEqual(decodeSearch(url.searchParams.get('filters')), normalizeSearch(filters));
    assert.equal(decodeSearch('{bad'), null); assert.equal(decodeSearch('[]'), null);
    assert.equal(normalizeSearch({ selectedDay: '2026-02-00' }).selectedDay, undefined);
    assert.equal(normalizeSearch({ selectedDay: '2026-02-31' }).selectedDay, undefined);
    assert.equal(normalizeSearch({ origin: { lat: 300, lng: 0 }, maxDistanceFilter: -10 }).origin, undefined);
    assert.deepEqual(normalizeSearch({ sources: ['FPC', 'unknown'], selectedYears: ['2026', 'evil'] }).sources, ['FPC']);
});
test('registration status never calls unknown or contradictory deadlines open or closed', () => {
    assert.equal(registrationStatus({}, now), 'unknown');
    assert.equal(registrationStatus({ registrationClosesAt: 'bad' }, now), 'unknown');
    assert.equal(registrationStatus(event, now), 'unknown');
    assert.equal(registrationStatus({ ...event, registrationOpensAt: '2026-09-01T00:00:00Z' }, now), 'open');
    assert.equal(registrationStatus({ ...event, registrationClosesAt: '2026-09-24T00:00:00Z' }, now), 'closed');
    assert.equal(registrationStatus({ ...event, registrationOpensAt: '2026-10-01T00:00:00Z' }, now), 'unknown');
    assert.equal(registrationStatus({ ...event, title: 'Prova cancelada' }, now), 'cancelled');
});
test('daily alerts establish a baseline, detect real changes and send each deadline only once', () => {
    const baseline = planFavoriteAlerts([event], {}, {}, now);
    assert.equal(baseline.notices.length, 0);
    const first = planFavoriteAlerts([event], baseline.snapshot, { changes: true, deadlines: true }, now);
    assert.equal(first.notices.length, 1); assert.equal(first.notices[0].changes.length, 0);
    assert.equal(planFavoriteAlerts([event], first.snapshot, { changes: true, deadlines: true }, now).notices.length, 0);
    const cancelled = planFavoriteAlerts([{ ...event, title: 'Prova cancelada' }], first.snapshot, { changes: true, deadlines: true }, now);
    assert.equal(cancelled.notices[0].changes[0].field, 'cancelled'); assert.equal(cancelled.notices[0].deadline, null);
    assert.equal(planFavoriteAlerts([], first.snapshot, { changes: true }, now).notices.length, 0);
    const moved = planFavoriteAlerts([{ ...event, date: '28 SET 2026', sortDate: '2026-09-28T00:00:00Z' }], first.snapshot, { changes: true }, now);
    assert.equal(moved.notices[0].changes[0].field, 'date');
    assert.match(alertEmail(first.notices).text, /2026-09-27 18:00/);
    assert.equal(verifiedEmail({ primaryEmailAddressId: 'a', emailAddresses: [{ id: 'a', emailAddress: 'x@example.test', verification: { status: 'unverified' } }] }), null);
});

test('only confirmed scraper saves stamp verification; merges retain the newest source check', async () => {
    const writes = [];
    const db = { municipality: { findMany: async () => [{ name: 'porto', lat: 41, lng: -8 }] }, event: {
        findUnique: async () => null, findMany: async () => [], create: async ({ data }) => { writes.push(data); return data; },
    } };
    await saveOrMergeEvent(db, { ...event, regiao: 'Porto', source: 'FPC' });
    assert.equal(writes[0].lastVerifiedAt, undefined);
    await saveOrMergeEvent(db, { ...event, regiao: 'Porto', source: 'FPC' }, { verifiedSource: 'FPC' });
    assert.ok(writes[1].lastVerifiedAt instanceof Date);
    const merged = mergeEventRecords({ ...event, source: 'FPC', lastVerifiedAt: '2026-09-01T00:00:00Z', lastVerifiedSource: 'FPC' }, { ...event, source: 'Cabreira', lastVerifiedAt: '2026-09-25T00:00:00Z', lastVerifiedSource: 'Cabreira' });
    assert.equal(merged.lastVerifiedSource, 'Cabreira');
});

test('alert preferences reject anonymous users, foreign origins and malformed consent', async () => {
    let userId = null;
    globalThis.alertPreferenceTest = { auth: async () => ({ userId }), clerkClient: () => { throw Error('Must not access users'); }, prisma: {}, Prisma: {}, favoriteAlertEvents: () => [], planFavoriteAlerts, verifiedEmail };
    const source = (await readFile(new URL('../app/api/alerts/preferences/route.js', import.meta.url), 'utf8')).replace(/^import .*;\r?\n/gm, '');
    const route = await import('data:text/javascript;base64,' + Buffer.from('const { auth, clerkClient, prisma, Prisma, favoriteAlertEvents, planFavoriteAlerts, verifiedEmail } = globalThis.alertPreferenceTest;\n' + source).toString('base64'));
    assert.equal((await route.GET()).status, 401);
    const request = (origin, body) => new Request('https://calendar.test/api/alerts/preferences', { method: 'PUT', headers: { origin, 'content-type': 'application/json' }, body: JSON.stringify(body) });
    assert.equal((await route.PUT(request('https://calendar.test', {}))).status, 401);
    userId = 'signed-in';
    assert.equal((await route.PUT(request('https://evil.test', {}))).status, 403);
    assert.equal((await route.PUT(request('https://calendar.test', { enabled: 'yes' }))).status, 400);
    assert.equal((await route.PUT(request('https://calendar.test', { enabled: true, changes: false, deadlines: false }))).status, 400);
    delete globalThis.alertPreferenceTest;
});
test('delivery failures retry the identical persisted message/key; successful sends are rate limited', async () => {
    let row = { userId: 'user', enabled: true, changes: true, deadlines: true, snapshot: {}, pending: null, leaseUntil: null };
    const db = { event: { findMany: async () => [{ ...event, sortDate: new Date(event.sortDate), registrationClosesAt: new Date(event.registrationClosesAt) }] }, favoriteAlert: {
        findUnique: async () => ({ ...row }),
        update: async ({ data }) => { Object.assign(row, data); return row; },
        updateMany: async ({ data }) => { Object.assign(row, data); return { count: 1 }; },
    } };
    const users = { getUser: async () => ({ unsafeMetadata: { favorites: ['race'] }, primaryEmailAddressId: 'mail', emailAddresses: [{ id: 'mail', verification: { status: 'verified' }, emailAddress: 'x@example.test' }] }) };
    const calls = [];
    const options = { db, users, row, now, jsonNull: null, send: async (email, key) => { calls.push({ email, key }); return calls.length === 1 ? { error: 'timeout' } : { data: { id: 'sent' } }; } };
    await assert.rejects(deliverFavoriteAlert(options));
    assert.ok(row.pending); assert.equal(row.leaseUntil, null);
    assert.equal(await deliverFavoriteAlert(options), 'sent'); assert.deepEqual(calls[0], calls[1]);
    assert.equal(row.pending, null);
    assert.equal(await deliverFavoriteAlert(options), 'limited'); assert.equal(calls.length, 2);
});
