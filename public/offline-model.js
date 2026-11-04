// Shared, dependency-free model for the offline reader and its browser snapshots.
export const OFFLINE_CATALOGUE_KEY = 'cycling_offline_catalogue_v1';
export const OFFLINE_PERSONAL_KEY = 'cycling_offline_personal_v1';
const statuses = new Set(['interested', 'going', 'registered']);
const isoDay = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10) === value ? value : '';
const text = (value, limit) => typeof value === 'string' ? value.slice(0, limit) : '';
export function cleanOfflineRows(value) {
    if (!Array.isArray(value)) return [];
    return value.slice(0, 10000).filter(row => row && typeof row.id === 'string' && row.id.length <= 1000 && typeof row.title === 'string').map(row => ({
        id: row.id, title: text(row.title, 300), date: text(row.date, 100),
        start: isoDay(row.start), end: isoDay(row.end),
        location: text(row.location, 200), discipline: text(row.discipline, 100), scope: text(row.scope, 100),
        source: text(row.source, 150), stage: row.stage === true,
        aliases: Array.isArray(row.aliases) ? row.aliases.filter(id => typeof id === 'string' && id.length <= 1000).slice(0, 50) : [],
        path: typeof row.path === 'string' && /^\/provas\/[a-z0-9-]+~[a-zA-Z0-9_-]+$/.test(row.path) ? row.path : '',
    }));
}
export function readOfflineCatalogue(storage) {
    try { const value = JSON.parse(storage.getItem(OFFLINE_CATALOGUE_KEY)); return value?.schema === 1 ? { events: cleanOfflineRows(value.events), updatedAt: text(value.updatedAt, 40) } : { events: [], updatedAt: '' }; }
    catch { return { events: [], updatedAt: '' }; }
}
export function readOfflinePersonal(storage) {
    try {
        const value = JSON.parse(storage.getItem(OFFLINE_PERSONAL_KEY));
        return new Map(value?.schema === 1 && Array.isArray(value.entries) ? value.entries.filter(row => Array.isArray(row) && typeof row[0] === 'string' && statuses.has(row[1])).map(row => [row[0], { status: row[1], google: row[2] === true }]) : []);
    } catch { return new Map(); }
}
export function offlinePersonalFor(event, personal) { return [event.id, ...(event.aliases || [])].map(id => personal.get(id)).find(Boolean) || null; }
export function offlineMonthShift(month, delta) {
    const date = new Date(month + '-01T12:00:00Z'); date.setUTCMonth(date.getUTCMonth() + delta);
    return date.toISOString().slice(0, 7);
}
export function offlineOccursOn(event, day) { return Boolean(event.start && event.start <= day && (event.end || event.start) >= day); }
export function offlineRoute(path) { return /^\/(?:minhas-provas|favoritos|agenda|nacionais|internacionais|tacas|regionais|lazer|~offline|offline\.html)?$/.test(path) || /^\/provas\//.test(path); }
export function offlineNavigationUrl(href, current) {
    try {
        const from = new URL(current), target = new URL(href, from);
        return target.origin === from.origin && offlineRoute(target.pathname) && (target.pathname !== from.pathname || target.search !== from.search) ? target.href : null;
    } catch { return null; }
}
const normal = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function offlineFilter(events, { query = '', discipline = '', personalOnly = false, googleOnly = false, period = 'future', today, month = '', day = '', pathname = '/' }, personal = new Map()) {
    const words = normal(query).split(/\s+/).filter(Boolean);
    return events.filter(event => {
        const saved = offlinePersonalFor(event, personal);
        if (personalOnly && !saved || googleOnly && !saved?.google) return false;
        if (words.some(word => !normal(event.title + ' ' + event.location + ' ' + event.discipline).includes(word))) return false;
        if (discipline && event.discipline !== discipline) return false;
        if (period === 'future' && (event.end || event.start) && (event.end || event.start) < today) return false;
        if (period === 'past' && (!(event.end || event.start) || (event.end || event.start) >= today)) return false;
        if (pathname === '/internacionais' && !/internacional|uci/i.test(event.scope)) return false;
        if (pathname === '/nacionais' && !/naciona/i.test(event.scope)) return false;
        if (pathname === '/tacas' && !/taça de portugal/i.test(event.scope)) return false;
        if (pathname === '/regionais' && !/regional/i.test(event.scope)) return false;
        if (pathname === '/lazer' && !/passeio|lazer|granfondo/i.test(event.discipline + ' ' + event.scope)) return false;
        if (day) return offlineOccursOn(event, day);
        if (month && event.start && !(event.start < offlineMonthShift(month, 1) + '-01' && (event.end || event.start) >= month + '-01')) return false;
        return true;
    }).sort((a, b) => (a.start || '9999').localeCompare(b.start || '9999'));
}
