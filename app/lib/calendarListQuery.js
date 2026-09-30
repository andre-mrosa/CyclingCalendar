import { PUBLIC_EVENT_SELECT, toPublicEvent } from './publicEvent.js';
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
    const events = await db.event.findMany({ where: { AND: conditions }, select: PUBLIC_EVENT_SELECT, orderBy: { sortDate: 'asc' } });
    return events.map(toPublicEvent).filter(Boolean);
}
