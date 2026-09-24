export const CALENDAR_SOURCES = ['FPC', 'Cabreira', 'Stop and Go', 'Classificações.net', 'Recorde Pessoal', 'Apedalar'];
export function normalizeCalendarSources(values) {
    return [...new Set(values)].filter(value => CALENDAR_SOURCES.includes(value)).sort();
}
