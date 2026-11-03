import test from 'node:test';
import assert from 'node:assert/strict';
import { fixtureModule } from './fixtureModule.mjs';
import { calendarRemovalIdentifiers, removeGoogleCalendarEntries } from '../app/lib/googleCalendarRemoval.js';
import { removeCalendarEvent } from '../app/utils/calendarRemoval.js';
import { matchesPersonalFilter } from '../app/utils/personalCollection.js';
import * as requestBody from '../app/lib/requestBody.js';

const event = { id: 'race/ç#', _allIds: ['old-id'] };
const request = (body, origin = 'https://calendar.test') => new Request('https://calendar.test/api/calendar/remove', {
    method: 'POST', headers: { origin, 'Content-Type': 'application/json' }, body: JSON.stringify(body),
});
async function route({ userId = 'owner', token = 'mock-token', remove = async () => 1 } = {}) {
    const oauthUsers = [];
    const api = await fixtureModule('../app/api/calendar/remove/route.js', {
        '@clerk/nextjs/server': { auth: async () => ({ userId }), clerkClient: async () => ({ users: { getUserOauthAccessToken: async id => {
            oauthUsers.push(id); return { data: token ? [{ token }] : [] };
        } } }) },
        '@/app/lib/requestBody': requestBody,
        '@/app/lib/googleCalendarRemoval': { calendarRemovalIdentifiers, removeGoogleCalendarEntries: remove },
    });
    return { api, oauthUsers };
}

test('removal validates owner, origin and identifiers before requesting Google access', async () => {
    const anonymous = await route({ userId: null, remove: () => assert.fail('Unexpected deletion') });
    assert.equal((await anonymous.api.POST(request({ event }))).status, 401);
    assert.equal(anonymous.oauthUsers.length, 0);
    const owner = await route({ remove: () => assert.fail('Unexpected deletion') });
    assert.equal((await owner.api.POST(request({ event }, 'https://foreign.test'))).status, 403);
    for (const invalid of [{ id: '' }, { id: 'x', _allIds: 'not-an-array' }, { id: 'x', _allIds: [null] }, { id: 'x'.repeat(1001) }]) {
        assert.equal((await owner.api.POST(request({ event: invalid }))).status, 400);
    }
    assert.equal((await owner.api.POST(request({ event, target: 'all-calendars' }))).status, 400);
    assert.equal(owner.oauthUsers.length, 0);
});

test('removal uses only the authenticated account and never trusts a supplied calendar or Google event ID', async () => {
    const calls = [];
    const { api, oauthUsers } = await route({ remove: async (...args) => { calls.push(args); return 2; } });
    const response = await api.POST(request({ event, userId: 'other', calendarId: 'other-calendar', googleEventId: 'unrelated' }));
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.deepEqual(oauthUsers, ['owner']);
    assert.deepEqual(calls, [['mock-token', ['race/ç#', 'old-id']]]);
    assert.equal((await response.json()).deletedCount, 2);
    const noToken = await route({ token: null, remove: () => assert.fail('Unexpected deletion') });
    assert.equal((await noToken.api.POST(request({ event }))).status, 403);
});

test('race removal never includes registration reminders, while explicit reminder removal supports old keys', () => {
    assert.deepEqual(calendarRemovalIdentifiers(event), ['race/ç#', 'old-id']);
    assert.deepEqual(calendarRemovalIdentifiers({ id: 'race' }, 'registration_open'), ['race_reg_open', 'race-reg_open']);
});

test('Google removal paginates lookups, verifies private markers, encodes IDs and removes matching aliases only', async t => {
    const deleted = [];
    const tagged = (id, key) => ({ id, extendedProperties: { private: { cyclingCalendarEventId: key } } });
    t.mock.method(globalThis, 'fetch', async (input, options) => {
        const url = new URL(input);
        assert.equal(url.origin, 'https://www.googleapis.com');
        assert.equal(options.headers.Authorization, 'Bearer fixture');
        if (options.method === 'DELETE') { deleted.push(url.href); return new Response(null, { status: 204 }); }
        if (url.pathname.endsWith('/calendarList')) return url.searchParams.has('pageToken')
            ? Response.json({ items: [{ id: 'owned/calendar', summary: 'Cycling Calendar' }] })
            : Response.json({ items: [], nextPageToken: 'next-calendar' });
        const key = url.searchParams.get('privateExtendedProperty').slice('cyclingCalendarEventId='.length);
        if (key === 'old-id') return Response.json({ items: [tagged('alias-event', key)] });
        if (url.searchParams.has('pageToken')) return Response.json({ items: [tagged('google/#1', key), tagged('second-event', key)] });
        return Response.json({ items: [tagged('google/#1', key), tagged('unrelated-event', 'another-race')], nextPageToken: 'next-event' });
    });
    assert.equal(await removeGoogleCalendarEntries('fixture', calendarRemovalIdentifiers(event)), 3);
    assert.equal(deleted.length, 3);
    assert.ok(deleted.some(url => url.includes('owned%2Fcalendar/events/google%2F%231')));
    assert.ok(deleted.every(url => new URL(url).searchParams.get('sendUpdates') === 'none'));
    assert.ok(deleted.every(url => !url.includes('unrelated-event')));
});

test('failed calendar or event lookups never delete anything or report success', async t => {
    let failCalendars = true, deletes = 0;
    t.mock.method(globalThis, 'fetch', async (input, options) => {
        if (options.method === 'DELETE') deletes++;
        if (String(input).includes('/calendarList') && !failCalendars) return Response.json({ items: [{ id: 'owned', summary: 'Cycling Calendar' }] });
        if (!failCalendars && new URL(input).searchParams.get('privateExtendedProperty') === 'cyclingCalendarEventId=race') return Response.json({ items: [{ id: 'would-be-deleted', extendedProperties: { private: { cyclingCalendarEventId: 'race' } } }] });
        return Response.json({ error: 'Unavailable' }, { status: 503 });
    });
    await assert.rejects(removeGoogleCalendarEntries('fixture', ['race', 'alias']));
    failCalendars = false;
    await assert.rejects(removeGoogleCalendarEntries('fixture', ['race', 'alias']));
    assert.equal(deletes, 0);
});

test('provider deletion failures propagate; already removed entries are idempotent', async t => {
    let deletionStatus = 403;
    t.mock.method(globalThis, 'fetch', async (input, options) => {
        if (String(input).includes('/calendarList')) return Response.json({ items: [] });
        if (options.method === 'DELETE') return new Response(null, { status: deletionStatus });
        return Response.json({ items: [{ id: 'entry', extendedProperties: { private: { cyclingCalendarEventId: 'race' } } }] });
    });
    await assert.rejects(removeGoogleCalendarEntries('fixture', ['race']), /Could not remove/);
    deletionStatus = 410;
    assert.equal(await removeGoogleCalendarEntries('fixture', ['race']), 1);
    const { api } = await route({ remove: async () => { throw Error('provider failure'); } });
    const response = await api.POST(request({ event }));
    assert.equal(response.status, 503);
    assert.equal((await response.json()).success, false);
});

test('cancelled confirmation or failed preservation cannot issue a calendar deletion', async () => {
    const forbid = () => assert.fail('Unexpected calendar request');
    assert.equal(await removeCalendarEvent(event, { confirm: () => false, preserve: forbid, refresh: forbid, request: forbid }), false);
    await assert.rejects(removeCalendarEvent(event, { confirm: () => true, preserve: async () => { throw Error('could not preserve'); }, refresh: forbid, request: forbid }), /could not preserve/);
});

test('confirmed removal preserves the collection first and refreshes calendar membership after the response', async () => {
    const steps = [];
    assert.equal(await removeCalendarEvent({ ...event, title: 'Not transmitted' }, {
        confirm: () => true, preserve: async () => { steps.push('preserve'); }, refresh: async () => { steps.push('refresh'); },
        request: async (url, options) => {
            steps.push('remove'); assert.equal(url, '/api/calendar/remove');
            assert.deepEqual(JSON.parse(options.body), { event, target: 'event' });
            return Response.json({ success: true });
        },
    }), true);
    assert.deepEqual(steps, ['preserve', 'remove', 'refresh']);
    steps.length = 0;
    await assert.rejects(removeCalendarEvent(event, { confirm: () => true, refresh: async () => steps.push('refresh'), request: async () => Response.json({ success: false }, { status: 503 }) }));
    assert.deepEqual(steps, ['refresh']);
});

test('calendar tab includes only real Google membership, independently of interest and registration', () => {
    assert.equal(matchesPersonalFilter('calendar', 'registered', false), false);
    assert.equal(matchesPersonalFilter('calendar', null, true), true);
    assert.equal(matchesPersonalFilter('calendar', 'interested', true), true);
    assert.equal(matchesPersonalFilter('registered', 'registered', false), true);
    assert.equal(matchesPersonalFilter('all', null, true), false);
});
