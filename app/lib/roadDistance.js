import { routeKey, validCoordinates } from '../utils/distance.js';

const error = (code, status = 503) => Object.assign(new Error(code), { code, status });

// These bounds apply per warm worker. The free provider's account quota remains
// the global ceiling across Vercel instances. Never retry or switch to a paid API.
export function createRoadDistanceService({ apiKey, fetchImpl = fetch, now = Date.now } = {}) {
    const cache = new Map();
    const pending = new Map();
    let minute = -1, day = -1, minuteCount = 0, dayCount = 0, blockedUntil = 0;
    return {
        available: !!apiKey,
        async calculate(origin, destination) {
            if (!validCoordinates(origin) || !validCoordinates(destination)) throw error('INVALID_COORDINATES', 400);
            if (!apiKey) throw error('NOT_CONFIGURED');
            const key = routeKey(origin, destination);
            const timestamp = now();
            const stored = cache.get(key);
            if (stored?.expiresAt > timestamp) return stored.distanceMeters;
            if (pending.has(key)) return pending.get(key);
            if (minute !== Math.floor(timestamp / 60000)) { minute = Math.floor(timestamp / 60000); minuteCount = 0; }
            if (day !== Math.floor(timestamp / 86400000)) { day = Math.floor(timestamp / 86400000); dayCount = 0; }
            if (timestamp < blockedUntil || minuteCount >= 30 || dayCount >= 1800) throw error('LIMIT_REACHED', 429);
            minuteCount++; dayCount++;
            const request = (async () => {
                try {
                    const values = key.split(',').map(Number);
                    const response = await fetchImpl('https://api.openrouteservice.org/v2/directions/driving-car/json', {
                        method: 'POST',
                        headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
                        body: JSON.stringify({ coordinates: [[values[1], values[0]], [values[3], values[2]]], instructions: false, geometry: false }),
                        signal: AbortSignal.timeout(10000), cache: 'no-store', redirect: 'error',
                    });
                    if (response.status === 429) {
                        blockedUntil = timestamp + 60000;
                        throw error('LIMIT_REACHED', 429);
                    }
                    if (!response.ok) throw error(response.status === 404 ? 'NO_ROUTE' : 'UNAVAILABLE');
                    const data = await response.json();
                    const distanceMeters = data?.routes?.[0]?.summary?.distance;
                    if (!Number.isFinite(distanceMeters) || distanceMeters < 0) throw error('NO_ROUTE');
                    cache.delete(key);
                    cache.set(key, { distanceMeters, expiresAt: now() + 86400000 });
                    if (cache.size > 200) cache.delete(cache.keys().next().value);
                    return distanceMeters;
                } catch (failure) {
                    if (failure.code === 'LIMIT_REACHED' || failure.code === 'NO_ROUTE' || failure.code === 'UNAVAILABLE') throw failure;
                    throw error('UNAVAILABLE');
                }
            })();
            pending.set(key, request);
            try { return await request; } finally { pending.delete(key); }
        },
    };
}

export async function roadDistanceResponse(request, service) {
    const headers = { 'Cache-Control': 'private, no-store' };
    try {
        const origin = request.headers.get('origin');
        if (origin && origin !== new URL(request.url).origin) return Response.json({ code: 'FORBIDDEN' }, { status: 403, headers });
        if (!request.headers.get('content-type')?.startsWith('application/json')) return Response.json({ code: 'INVALID_REQUEST' }, { status: 415, headers });
        const reader = request.body?.getReader();
        if (!reader) throw error('INVALID_REQUEST', 400);
        const chunks = []; let length = 0;
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            length += value.length;
            if (length > 1024) { await reader.cancel(); throw error('INVALID_REQUEST', 413); }
            chunks.push(value);
        }
        let body;
        try { body = JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { throw error('INVALID_REQUEST', 400); }
        const distanceMeters = await service.calculate(body?.origin, body?.destination);
        return Response.json({ distanceMeters, provider: 'openrouteservice' }, { headers });
    } catch (failure) {
        return Response.json({ code: failure.code || 'UNAVAILABLE' }, { status: failure.status || 503, headers });
    }
}
