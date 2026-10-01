export const ANALYTICS_AGGREGATE_TYPES = Object.freeze([
    'SESSION_START', 'PAGE_VIEW', 'SEARCH', 'ICS_EXPORT', 'FAVORITE_TOGGLE', 'EVENT_OPEN',
]);

const PUBLIC_PATHS = new Set([
    '/', '/nacionais', '/internacionais', '/tacas', '/regionais', '/lazer',
    '/ajuda', '/contacto', '/privacy-policy', '/terms-of-service',
]);

export function normalizeAnalyticsPath(value) {
    if (typeof value !== 'string' || value.length > 200 || value.includes('?') || value.includes('#')) return null;
    return PUBLIC_PATHS.has(value) ? value : null;
}

export function analyticsBucket(now = new Date()) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function analyticsAggregateKey(day, type, path, targetId = null) {
    return [day.toISOString().slice(0, 10), type, path, targetId || ''].join('|');
}

export function analyticsSince(timeframe, now = new Date()) {
    const today = analyticsBucket(now);
    if (timeframe === 'today') return today;
    if (timeframe === '7d' || timeframe === '30d') {
        today.setUTCDate(today.getUTCDate() - (timeframe === '7d' ? 6 : 29));
        return today;
    }
    if (timeframe === '13m' || timeframe === 'all') {
        today.setUTCMonth(today.getUTCMonth() - 12);
        return today;
    }
    return null;
}
