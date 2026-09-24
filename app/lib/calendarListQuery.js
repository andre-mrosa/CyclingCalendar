import { getEventDiscipline, getEventCategories } from '../utils/eventClassifier.js';
import { hydrateListSummaries } from './calendarSummary.js';
export function parseListQuery(params, currentYear = new Date().getFullYear()) {
    const raw = params.get('years') || params.get('year') || String(currentYear);
    if (raw === 'all') return [];
    const years = [...new Set(raw.split(',').map(s => s.trim()))].sort();
    if (!years.length || years.length > 20 || years.some(y => !/^\d{4}$/.test(y) || Number(y) < 1900 || Number(y) > 2100)) throw new Error('Ano inválido');
    return years;
}
export async function queryCalendarList(db, years, sources) {
    const conditions = [{ NOT: { source: { contains: 'Quarentena' } } }, { OR: sources.map(source => ({ source: { contains: source, mode: 'insensitive' } })) }];
    if (years.length) conditions.push({ OR: years.map(year => ({ OR: [
        { date: { contains: year } }, { sortDate: { gte: new Date(year + '-01-01T00:00:00Z'), lte: new Date(year + '-12-31T23:59:59.999Z') } },
    ] })) });
    const events = await db.event.findMany({ where: { AND: conditions }, select: {
        id: true, title: true, date: true, sortDate: true, details: true, tag: true, ambito: true,
        escaloes: true, licenca: true, regiao: true, distrito: true, source: true, link: true,
        organizador: true, registrationOpensAt: true, registrationClosesAt: true, lat: true, lng: true,
        listSummary: true, translations: { select: { language: true, title: true, details: true } },
    }, orderBy: { sortDate: 'asc' } });
    const missing = events.filter(event => event.listSummary?.version !== 1).map(event => event.id);
    const hydrated = missing.length ? await hydrateListSummaries(db, missing) : new Map();
    return events.map(({ listSummary, ...event }) => {
        const summary = hydrated.get(event.id) || listSummary || {};
        return { ...event, locationInfo: summary.locationInfo,
            registrationOpensAt: summary.registrationOpensAt ?? event.registrationOpensAt,
            registrationClosesAt: summary.registrationClosesAt ?? event.registrationClosesAt,
            tag: getEventDiscipline(event), escaloes: getEventCategories(event),
        };
    });
}
