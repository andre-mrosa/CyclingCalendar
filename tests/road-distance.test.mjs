import test from 'node:test';
import assert from 'node:assert/strict';
import { createRoadDistanceService, roadDistanceResponse } from '../app/lib/roadDistance.js';
import { calculateDistance, drivingMapUrl, routeKey } from '../app/utils/distance.js';
import { parseRoadCache, cachedRoadDistance, addRoadDistance } from '../app/utils/roadDistanceCache.js';

const origin = { lat: 38.72, lng: -9.14 }, destination = { lat: 39.4, lng: -8.2 };
const payload = { origin, destination };
const makeRequest = (body = JSON.stringify(payload), headers = {}) => new Request('https://calendar.test/api/road-distance', {
    method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body,
});

test('disabled road service never sends coordinates to a provider', async () => {
    const service = createRoadDistanceService({ fetchImpl: () => assert.fail('Unexpected external call') });
    assert.equal(service.available, false);
    const response = await roadDistanceResponse(makeRequest(), service);
    assert.equal(response.status, 503);
    assert.equal((await response.json()).code, 'NOT_CONFIGURED');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
});

test('road requests reject malformed, oversized, cross-origin and invalid coordinates before fetching', async () => {
    const service = createRoadDistanceService({ apiKey: 'test', fetchImpl: () => assert.fail('Unexpected external call') });
    for (const body of ['{', 'null', '{}', JSON.stringify({ origin: { lat: 91, lng: 0 }, destination }), JSON.stringify({ origin: { lat: '38', lng: -9 }, destination })]) {
        assert.equal((await roadDistanceResponse(makeRequest(body), service)).status, 400);
    }
    assert.equal((await roadDistanceResponse(makeRequest(' '.repeat(1025)), service)).status, 413);
    assert.equal((await roadDistanceResponse(makeRequest(undefined, { origin: 'https://other.test' }), service)).status, 403);
    assert.equal((await roadDistanceResponse(makeRequest(undefined, { 'Content-Type': 'text/plain' }), service)).status, 415);
});

test('road service sends only coordinates, keeps credentials server-side and deduplicates/cache hits', async () => {
    let calls = 0, now = 1000;
    const service = createRoadDistanceService({ apiKey: 'private-test-key', now: () => now, fetchImpl: async (url, options) => {
        calls++;
        assert.equal(url, 'https://api.openrouteservice.org/v2/directions/driving-car/json');
        assert.equal(options.headers.Authorization, 'private-test-key');
        assert.deepEqual(JSON.parse(options.body), { coordinates: [[-9.14, 38.72], [-8.2, 39.4]], instructions: false, geometry: false });
        return Response.json({ routes: [{ summary: { distance: 123456 } }] });
    } });
    assert.deepEqual(await Promise.all([service.calculate(origin, destination), service.calculate(origin, destination)]), [123456, 123456]);
    assert.equal(calls, 1);
    const response = await roadDistanceResponse(makeRequest(), service);
    assert.deepEqual(await response.json(), { distanceMeters: 123456, provider: 'openrouteservice' });
    assert.equal(calls, 1);
    now += 86400001;
    await service.calculate(origin, destination);
    assert.equal(calls, 2);
});

test('free quota exhaustion pauses requests; failures never become straight-line road distances', async () => {
    let calls = 0;
    const limited = createRoadDistanceService({ apiKey: 'test', fetchImpl: async () => { calls++; return new Response(null, { status: 429 }); } });
    for (let i = 0; i < 2; i++) assert.equal((await roadDistanceResponse(makeRequest(), limited)).status, 429);
    assert.equal(calls, 1);
    for (const reply of [() => Response.json({ routes: [] }), () => Response.json({ routes: [{ summary: { distance: -1 } }] }), () => { throw new Error('secret-provider-response'); }]) {
        const service = createRoadDistanceService({ apiKey: 'test', fetchImpl: reply });
        const response = await roadDistanceResponse(makeRequest(), service);
        assert.equal(response.status, 503);
        assert.doesNotMatch(await response.text(), /secret-provider-response|distanceMeters/);
    }
});

test('worker request budget rejects new routes but still serves cached routes', async () => {
    let calls = 0;
    const service = createRoadDistanceService({ apiKey: 'test', now: () => 1000, fetchImpl: async () => { calls++; return Response.json({ routes: [{ summary: { distance: 1000 } }] }); } });
    for (let i = 0; i < 30; i++) await service.calculate({ lat: i, lng: -9 }, destination);
    await assert.rejects(service.calculate({ lat: 31, lng: -9 }, destination), { code: 'LIMIT_REACHED' });
    assert.equal(await service.calculate({ lat: 0, lng: -9 }, destination), 1000);
    assert.equal(calls, 30);
});

test('browser road cache expires, is bounded and changes with either coordinate pair', () => {
    const raw = addRoadDistance('[]', origin, destination, 123456, 1000);
    const rows = parseRoadCache(raw, 2000);
    assert.equal(cachedRoadDistance(rows, origin, destination), 123456);
    assert.equal(cachedRoadDistance(rows, { ...origin, lat: 39 }, destination), null);
    assert.equal(cachedRoadDistance(rows, origin, { ...destination, lng: -8 }), null);
    assert.deepEqual(parseRoadCache(raw, 1000 + 7 * 86400000), []);
    assert.deepEqual(parseRoadCache('{'), []);
    let many = '[]';
    for (let i = 0; i < 120; i++) many = addRoadDistance(many, { lat: i / 10, lng: 0 }, destination, i, 1000);
    assert.equal(parseRoadCache(many, 1000).length, 100);
});

test('coordinates on the equator/meridian work and Maps links require no API key', () => {
    assert.equal(calculateDistance(0, 0, 0, 0), 0);
    assert.equal(calculateDistance(null, 0, 1, 1), null);
    assert.equal(calculateDistance(91, 0, 1, 1), null);
    assert.equal(routeKey(origin, { lat: NaN, lng: 0 }), null);
    const url = new URL(drivingMapUrl(origin, destination));
    assert.equal(url.origin, 'https://www.google.com');
    assert.equal(url.searchParams.get('origin'), '38.72,-9.14');
    assert.equal(url.searchParams.get('destination'), '39.4,-8.2');
    assert.equal(url.searchParams.get('travelmode'), 'driving');
    assert.equal(url.searchParams.get('key'), null);
    assert.equal(new URL(drivingMapUrl(null, destination)).searchParams.has('origin'), false);
});
