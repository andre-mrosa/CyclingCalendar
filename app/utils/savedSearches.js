import { CALENDAR_SOURCES } from '../lib/calendarSources.js';
// Only recognised filters can enter the URL or a saved search.
const strings = ['searchTerm', 'selectedAmbito', 'selectedLicenca', 'selectedRegiao', 'selectedDistrito', 'selectedType'];
const lists = ['selectedYears', 'selectedEscaloes', 'selectedTags', 'sources'];
export function normalizeSearch(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const result = {};
    for (const key of strings) if (typeof value[key] === 'string') result[key] = value[key].slice(0, 200);
    for (const key of lists) if (Array.isArray(value[key])) result[key] = [...new Set(value[key].filter(v => typeof v === 'string' && v.length <= 80))].slice(0, 30);
    for (const key of ['monthFrom', 'monthTo']) if (Number.isInteger(value[key]) && value[key] >= 1 && value[key] <= 12) result[key] = value[key];
    if (result.monthFrom > result.monthTo) result.monthTo = result.monthFrom;
    for (const [key, allowed] of Object.entries({ pastEventsFilter: ['todos', 'futuros', 'passados'], quickPeriod: ['', 'open', 'month', 'weekend'], viewMode: ['list', 'calendar'] })) {
        if (allowed.includes(value[key])) result[key] = value[key];
    }
    for (const [key, pattern] of [['selectedMonth', /^\d{4}-(0[1-9]|1[0-2])$/], ['selectedDay', /^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/]]) {
        if (value[key] === null || (typeof value[key] === 'string' && pattern.test(value[key]))) result[key] = value[key];
    }
    if (result.selectedDay) {
        const parsed = new Date(`${result.selectedDay}T12:00:00Z`);
        if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== result.selectedDay) delete result.selectedDay;
    }
    result.maxDistanceFilter = Number.isFinite(value.maxDistanceFilter) && value.maxDistanceFilter > 0 && value.maxDistanceFilter <= 20000 ? value.maxDistanceFilter : null;
    const origin = value.origin;
    if (origin && Number.isFinite(origin.lat) && Math.abs(origin.lat) <= 90 && Number.isFinite(origin.lng) && Math.abs(origin.lng) <= 180) result.origin = { lat: origin.lat, lng: origin.lng };
    if (result.sources) result.sources = result.sources.filter(source => CALENDAR_SOURCES.includes(source));
    if (result.selectedYears) result.selectedYears = result.selectedYears.filter(year => /^(19|20|21)\d{2}$/.test(year));
    return result;
}
export function decodeSearch(raw) {
    if (!raw || raw.length > 12000) return null;
    try { return normalizeSearch(JSON.parse(raw)); } catch { return null; }
}
export function searchUrl(href, filters) {
    const url = new URL(href);
    url.searchParams.delete('event');
    url.searchParams.set('filters', JSON.stringify(normalizeSearch(filters)));
    return url.toString();
}
