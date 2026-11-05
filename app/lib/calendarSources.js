export const CALENDAR_SOURCES = ['FPC', 'Cabreira', 'Stop and Go', 'Classificações.net', 'Recorde Pessoal', 'Apedalar', 'Organizador'];
const sourceInfo={FPC:['Federação Portuguesa de Ciclismo (FPC)','fpc'],Cabreira:['Cabreira Solutions','cabreira'],'Stop and Go':['Stop and Go','stop'],'Classificações.net':['Classificações.net','classificacoes'],'Recorde Pessoal':['Recorde Pessoal','recorde'],Apedalar:['Apedalar','apedalar'],Organizador:['Organizador','organizer']};
export const CALENDAR_SOURCE_OPTIONS=CALENDAR_SOURCES.map(id=>({id,name:sourceInfo[id][0],descriptionKey:'settings_source_'+sourceInfo[id][1]}));
export function normalizeCalendarSources(values) {
    return [...new Set(values)].filter(value => CALENDAR_SOURCES.includes(value)).sort();
}

export function selectCalendarSources(events, sources) {
    if (!Array.isArray(events)) return undefined;
    if (!sources.length) return [];
    return events.filter(event => sources.some(source => String(event.source || '').toLowerCase().includes(source.toLowerCase())));
}
