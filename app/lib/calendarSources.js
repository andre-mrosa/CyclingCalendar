export const CALENDAR_SOURCES = ['FPC', 'Cabreira', 'Stop and Go', 'Classificações.net', 'Recorde Pessoal', 'Apedalar', 'Organizador'];
export function normalizeCalendarSources(values) {
    return [...new Set(values)].filter(value => CALENDAR_SOURCES.includes(value)).sort();
}

export function selectCalendarSources(events, sources) {
    if (!Array.isArray(events)) return undefined;
    if (!sources.length) return [];
    return events.filter(event => sources.some(source => String(event.source || '').toLowerCase().includes(source.toLowerCase())));
}
