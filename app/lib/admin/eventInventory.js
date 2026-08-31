export const PUBLISHED_EVENTS_WHERE = { NOT: { source: { contains: 'Quarentena' } } };

const SOURCE_DEFINITIONS = [
    ['fpc', 'FPC', 'FPCiclismo'],
    ['cabreira', 'Cabreira', 'Cabreira Solutions'],
    ['stopAndGo', 'Stop and Go', 'Stop and Go'],
    ['classificacoes', 'Classificações.net', 'Classificações.net'],
];

// Source counts overlap. Only total/byYear.total count each stored event once.
// Aggregated input avoids loading programmes and base64 posters into memory.
export function buildEventInventory(groups, now = new Date()) {
    const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Lisbon' }).format(now);
    const inventory = {
        total: 0, storedTotal: 0, quarantined: 0, multiSource: 0,
        upcoming: 0, past: 0, undated: 0,
        sources: SOURCE_DEFINITIONS.map(([id, , name]) => ({ id, name, count: 0, exclusive: 0 })),
    };
    const years = new Map();
    for (const row of groups) {
        const count = row._count?._all ?? 1;
        inventory.storedTotal += count;
        if (row.source?.includes('Quarentena')) {
            inventory.quarantined += count;
            continue;
        }
        const sourceNames = [...new Set((row.source || '').split(',').map(value => value.trim()).filter(Boolean))];
        const date = row.sortDate ? new Date(row.sortDate) : null;
        const day = date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 10) : null;
        const year = day ? Number(day.slice(0, 4)) : null;
        if (!years.has(year)) years.set(year, { year, total: 0, fpc: 0, cabreira: 0, stopAndGo: 0, classificacoes: 0, multiSource: 0 });
        const yearRow = years.get(year);
        inventory.total += count;
        yearRow.total += count;
        inventory[!day ? 'undated' : day < today ? 'past' : 'upcoming'] += count;
        if (sourceNames.length > 1) {
            inventory.multiSource += count;
            yearRow.multiSource += count;
        }
        for (const [index, [id, token]] of SOURCE_DEFINITIONS.entries()) {
            if (!sourceNames.includes(token)) continue;
            inventory.sources[index].count += count;
            if (sourceNames.length === 1) inventory.sources[index].exclusive += count;
            yearRow[id] += count;
        }
    }
    for (const source of inventory.sources) inventory[source.id] = source.count;
    inventory.byYear = [...years.values()].sort((a, b) => (b.year || 0) - (a.year || 0));
    return inventory;
}
