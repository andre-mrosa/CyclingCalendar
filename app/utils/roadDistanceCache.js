import { routeKey } from './distance.js';

export const ROAD_CACHE_KEY = 'cycling_road_distances_v1';
const TTL = 7 * 86400000;
export function parseRoadCache(raw, now = Date.now()) {
    try {
        const rows = JSON.parse(raw);
        return Array.isArray(rows) ? rows.filter(row => row && typeof row.key === 'string'
            && Number.isFinite(row.distanceMeters) && row.distanceMeters >= 0
            && Number.isFinite(row.savedAt) && row.savedAt <= now && now - row.savedAt < TTL).slice(-100) : [];
    } catch { return []; }
}
export function cachedRoadDistance(rows, origin, destination) {
    const key = routeKey(origin, destination);
    return key ? rows.find(row => row.key === key)?.distanceMeters ?? null : null;
}
export function addRoadDistance(raw, origin, destination, distanceMeters, now = Date.now()) {
    const key = routeKey(origin, destination);
    if (!key || !Number.isFinite(distanceMeters) || distanceMeters < 0) return raw;
    return JSON.stringify([...parseRoadCache(raw, now).filter(row => row.key !== key), { key, distanceMeters, savedAt: now }].slice(-100));
}
