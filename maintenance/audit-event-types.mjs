import { prisma } from '../app/lib/db.js';
import {
    getEventDisciplineFamilies,
    getEventRaceTypes,
    getRaceTypeFamily,
    isOfficialNationalChampionship,
    RACE_TAXONOMY
} from '../app/utils/eventClassifier.js';

const increment = (map, key) => map.set(key, (map.get(key) || 0) + 1);
const sortedCounts = map => [...map.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([name, count]) => ({ name, count }));
const plainTextExcerpt = value => value
    ? value
        .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
        .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/gi, ' ')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 520)
    : null;
const eventSummary = event => ({
    id: event.id,
    title: event.title,
    date: event.date,
    details: event.details,
    tag: event.tag,
    source: event.source,
    descriptionExcerpt: plainTextExcerpt(event.description),
    families: getEventDisciplineFamilies(event),
    raceTypes: getEventRaceTypes(event)
});

try {
    let events = await prisma.event.findMany({
        where: { NOT: { source: { contains: 'Quarentena' } } },
        select: {
            id: true,
            title: true,
            date: true,
            details: true,
            tag: true,
            source: true,
            description: true
        },
        orderBy: [{ sortDate: 'asc' }, { title: 'asc' }]
    });

    const nationalYear = process.argv
        .find(argument => argument.startsWith('--national-year='))
        ?.split('=')[1];
    if (nationalYear) {
        events = events.filter(event =>
            event.date?.includes(nationalYear) && isOfficialNationalChampionship(event)
        );
    }

    const familyCounts = new Map();
    const raceTypeCounts = new Map();
    const tagCounts = new Map();
    const sourceCounts = new Map();
    const familyTagCounts = new Map();
    const knownFamilies = new Set(RACE_TAXONOMY.map(group => group.discipline));
    const unknownFamilies = [];
    const nationalChampionships = [];
    const nationalChampionshipCounts = new Map();
    const descriptionInfluenced = [];
    const genericRoadFallbacks = [];
    const multiSpeciality = [];
    const storedTagMismatches = [];

    for (const event of events) {
        const families = getEventDisciplineFamilies(event);
        const raceTypes = getEventRaceTypes(event);
        families.forEach(value => increment(familyCounts, value));
        raceTypes.forEach(value => increment(raceTypeCounts, value));
        increment(tagCounts, event.tag || '(sem tag)');
        for (const family of families) increment(familyTagCounts, `${family} ← ${event.tag || '(sem tag)'}`);
        for (const source of (event.source || '').split(',').map(value => value.trim()).filter(Boolean)) increment(sourceCounts, source);

        if (families.some(value => !knownFamilies.has(value))) unknownFamilies.push(eventSummary(event));
        if (isOfficialNationalChampionship(event)) {
            nationalChampionships.push(eventSummary(event));
            const year = event.date?.match(/20\d{2}/)?.[0] || '(sem ano)';
            for (const raceType of raceTypes) increment(nationalChampionshipCounts, `${year} · ${raceType}`);
        }

        const storedTagFamily = getRaceTypeFamily(event.tag || '');
        if (knownFamilies.has(storedTagFamily) && !families.includes(storedTagFamily)) {
            storedTagMismatches.push({ ...eventSummary(event), storedTagFamily });
        }

        const withoutDescription = getEventRaceTypes({ ...event, description: '' });
        if (JSON.stringify(raceTypes) !== JSON.stringify(withoutDescription)) {
            descriptionInfluenced.push({ ...eventSummary(event), withoutDescription });
        }

        const evidence = `${event.title || ''} ${event.details || ''} ${event.tag || ''}`
            .toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const hasRoadEvidence = /estrada|road|fundo|circuito|criterium|criterio|\bcri\b|\bitt\b|\bcre\b|\bttt\b|contra[- ]?relogio|granfondo|mediofondo|minifondo|volta\s+a|classica|premio/.test(evidence);
        if (raceTypes.length === 1 && raceTypes[0] === 'Estrada' && !hasRoadEvidence) genericRoadFallbacks.push(eventSummary(event));
        if (raceTypes.length > 1) multiSpeciality.push(eventSummary(event));
    }

    console.log(JSON.stringify({
        total: events.length,
        byFamily: sortedCounts(familyCounts),
        byRaceType: sortedCounts(raceTypeCounts),
        byStoredTag: sortedCounts(tagCounts),
        byFamilyAndStoredTag: sortedCounts(familyTagCounts),
        bySource: sortedCounts(sourceCounts),
        audit: {
            nationalChampionshipCount: nationalChampionships.length,
            nationalChampionshipCounts: sortedCounts(nationalChampionshipCounts),
            nationalChampionships,
            unknownFamilyCount: unknownFamilies.length,
            unknownFamilies: unknownFamilies.slice(0, 40),
            descriptionInfluencedCount: descriptionInfluenced.length,
            descriptionInfluenced: descriptionInfluenced.slice(0, 40),
            storedTagMismatchCount: storedTagMismatches.length,
            storedTagMismatches: storedTagMismatches.slice(0, 100),
            genericRoadFallbackCount: genericRoadFallbacks.length,
            genericRoadFallbacks: genericRoadFallbacks.slice(0, 80),
            multiSpecialityCount: multiSpeciality.length,
            multiSpeciality: multiSpeciality.slice(0, 40)
        }
    }, null, 2));
} finally {
    await prisma.$disconnect();
}
