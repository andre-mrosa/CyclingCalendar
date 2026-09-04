import { isSameEvent } from './eventMatcher.js';
import { getEventDiscipline, isOfficialNationalChampionship } from '../../utils/eventClassifier.js';
import { getAmbito } from '../scrapers/utils.js';

/**
 * Combina duas listas de links extras sem duplicar URLs
 */
export function mergeExtraLinks(linksJson1, linksJson2) {
    const parse = (json) => {
        if (!json) return [];
        if (Array.isArray(json)) return json;
        try {
            const parsed = JSON.parse(json);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const list1 = parse(linksJson1);
    const list2 = parse(linksJson2);

    const merged = [];
    const seenUrls = new Set();

    for (const item of [...list1, ...list2]) {
        if (item && item.link && !seenUrls.has(item.link.toLowerCase())) {
            seenUrls.add(item.link.toLowerCase());
            merged.push(item);
        }
    }

    return merged.length > 0 ? JSON.stringify(merged) : null;
}

/**
 * Combina duas listas de escalões em formato JSON
 */
export function mergeEscaloes(escJson1, escJson2) {
    const parse = (json) => {
        if (!json) return [];
        if (Array.isArray(json)) return json;
        try {
            const parsed = JSON.parse(json);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    const list1 = parse(escJson1);
    const list2 = parse(escJson2);

    const combined = Array.from(new Set([...list1, ...list2])).filter(Boolean);
    return combined.length > 0 ? JSON.stringify(combined) : JSON.stringify(['Todos (Aberto)']);
}

/**
 * Combina os valores de duas fontes (ex: "FPC" e "Cabreira" -> "FPC, Cabreira")
 */
export function mergeSources(source1, source2) {
    const set = new Set();
    if (source1) source1.split(',').map(s => s.trim()).filter(Boolean).forEach(s => set.add(s));
    if (source2) source2.split(',').map(s => s.trim()).filter(Boolean).forEach(s => set.add(s));
    return Array.from(set).join(', ') || 'FPC';
}

/**
 * Combina dois registos da mesma prova campo a campo
 */
export function mergeEventRecords(existing, incoming) {
    const sources = mergeSources(existing.source, incoming.source);
    const escaloes = mergeEscaloes(existing.escaloes, incoming.escaloes);

    // Links cruzados: Preservação inteligente de todas as plataformas
    const parseLinks = (linksJson) => {
        if (!linksJson) return [];
        if (Array.isArray(linksJson)) return linksJson;
        try {
            const parsed = JSON.parse(linksJson);
            return Array.isArray(parsed) ? parsed : [];
        } catch {
            return [];
        }
    };

    let extraLinksList = [...parseLinks(existing.extraLinks), ...parseLinks(incoming.extraLinks)];
    let primaryLink = existing.link || incoming.link;

    if (existing.link && incoming.link && existing.link.toLowerCase() !== incoming.link.toLowerCase()) {
        const isExistingFpc = existing.link.includes('fpciclismo.pt');
        const isIncomingOrg = incoming.link.includes('cabreirasolutions.com') || incoming.link.includes('stopandgo.net');

        if (isExistingFpc && isIncomingOrg) {
            if (!extraLinksList.some(l => l.link?.toLowerCase() === existing.link.toLowerCase())) {
                extraLinksList.push({ label: 'Ficha Homologação FPC', link: existing.link });
            }
            primaryLink = incoming.link;
        } else {
            const incomingLabel = incoming.source?.includes('Cabreira')
                ? 'Site Oficial Cabreira'
                : incoming.source?.includes('Stop')
                    ? 'Inscrições Stop & Go'
                    : incoming.source?.includes('Classificações')
                        ? 'Classificações e Resultados'
                        : 'Página da Organização';

            if (!extraLinksList.some(l => l.link?.toLowerCase() === incoming.link.toLowerCase())) {
                extraLinksList.push({ label: incomingLabel, link: incoming.link });
            }
        }
    }

    // Deduplicar lista final de links extras
    const seenUrls = new Set();
    const finalExtraLinks = [];
    for (const item of extraLinksList) {
        if (item && item.link && !seenUrls.has(item.link.toLowerCase())) {
            seenUrls.add(item.link.toLowerCase());
            finalExtraLinks.push(item);
        }
    }
    const extraLinks = finalExtraLinks.length > 0 ? JSON.stringify(finalExtraLinks) : null;

    // Priorizar data real caso uma delas seja placeholder ou se incoming tiver intervalo " a "
    const isExistingPlaceholder = !existing.date || existing.date.includes('DEFINIR') || existing.date.includes('A definir');
    const isIncomingPlaceholder = !incoming.date || incoming.date.includes('DEFINIR') || incoming.date.includes('A definir');

    let date = existing.date;
    let sortDate = existing.sortDate;

    if (isExistingPlaceholder && !isIncomingPlaceholder) {
        date = incoming.date;
        sortDate = incoming.sortDate;
    } else if (!isExistingPlaceholder && !isIncomingPlaceholder) {
        if (incoming.date && incoming.date.includes(' a ') && !existing.date?.includes(' a ')) {
            date = incoming.date;
            sortDate = incoming.sortDate;
        }
    } else if (isExistingPlaceholder && isIncomingPlaceholder) {
        date = incoming.date || existing.date;
        sortDate = incoming.sortDate || existing.sortDate;
    }

    // Localização mais completa
    let details = existing.details;
    if (!details || details === 'A definir' || (incoming.details && incoming.details.length > details.length)) {
        details = incoming.details;
    }

    // Fresh official rows/header data repair previously guessed dates/locations.
    if (incoming.source === 'FPC' || (incoming.source === 'Stop and Go' && existing.source === 'Stop and Go')) {
        date = incoming.date;
        sortDate = incoming.sortDate;
        details = incoming.details || details;
    }

    // Programa e Documentos: se ambos tiverem conteúdo útil, combina sem perda
    let programa = existing.programa || incoming.programa;
    if (existing.programa && incoming.programa && existing.programa !== incoming.programa) {
        if (existing.source?.includes('FPC') && (incoming.source?.includes('Cabreira') || incoming.source?.includes('Stop'))) {
            programa = `${incoming.programa}<br/><br/>${existing.programa}`;
        }
    }

    const official = incoming.source === 'FPC' ? incoming : existing.source?.includes('FPC') ? existing : null;
    const finalTitle = official && isOfficialNationalChampionship(official) ? official.title : existing.title || incoming.title;
    const finalTag = getEventDiscipline({
        title: finalTitle,
        details: official?.details || details,
        tag: official?.tag || incoming.tag || existing.tag,
        description: existing.description || incoming.description || ''
    });
    const finalAmbito = getAmbito(finalTitle, official?.details || details || '', finalTag, sources);

    return {
        title: finalTitle,
        date: date,
        sortDate: sortDate,
        details: details,
        tag: finalTag,
        ambito: finalAmbito,
        escaloes: escaloes,
        licenca: existing.licenca && existing.licenca !== 'Todas' ? existing.licenca : (incoming.licenca || existing.licenca),
        regiao: existing.regiao && existing.regiao !== 'Todas' ? existing.regiao : (incoming.regiao || existing.regiao),
        distrito: existing.distrito && existing.distrito !== 'Todos' ? existing.distrito : (incoming.distrito || existing.distrito),
        source: sources,
        link: primaryLink,
        extraLinks: extraLinks,
        organizador: existing.organizador || incoming.organizador,
        registrationOpensAt: existing.registrationOpensAt || incoming.registrationOpensAt,
        registrationClosesAt: existing.registrationClosesAt || incoming.registrationClosesAt,
        prices: existing.prices || incoming.prices,
        description: existing.description || incoming.description,
        insurance: existing.insurance || incoming.insurance,
        prizes: existing.prizes || incoming.prizes,
        programa: programa,
        logo: existing.logo || incoming.logo,
        image: existing.image || incoming.image,
        gpxData: incoming.gpxData || existing.gpxData,
    };
}

/**
 * Salva um novo evento ou faz merge inteligente se a prova já existir na base de dados
 */
export async function saveOrMergeEvent(prisma, eventData, options = {}) {
    if (!eventData || !eventData.id) return null;
    // Report only settled database outcomes; telemetry must never turn a saved
    // event into a failed save or trigger a retry of that write.
    const report = async (result) => {
        try { await options.onResult?.(result); } catch { /* best-effort telemetry */ }
        return result;
    };

    // 1. Procurar por ID exato
    const existingById = await prisma.event.findUnique({
        where: { id: eventData.id }
    });

    if (existingById) {
        if (existingById.source?.includes('Quarentena')) return report({ action: 'quarantined', event: existingById });
        const mergedData = mergeEventRecords(existingById, eventData);
        const updated = await prisma.event.update({
            where: { id: existingById.id },
            data: mergedData
        });
        return report({ action: 'updated', event: updated });
    }

    // 2. Procurar por Prova Equivalente no mesmo intervalo de datas (±3 dias)
    if (eventData.sortDate) {
        const eventDate = new Date(eventData.sortDate);
        const minDate = new Date(eventDate.getTime() - 4 * 24 * 60 * 60 * 1000);
        const maxDate = new Date(eventDate.getTime() + 4 * 24 * 60 * 60 * 1000);

        const candidates = await prisma.event.findMany({
            where: {
                sortDate: {
                    gte: minDate,
                    lte: maxDate
                }
            }
        });

        for (const candidate of candidates) {
            if (isSameEvent(candidate, eventData)) {
                // Encontrámos a mesma prova! Fazemos a fusão (complementação) dos dados
                const mergedData = mergeEventRecords(candidate, eventData);
                const updated = await prisma.event.update({
                    where: { id: candidate.id },
                    data: mergedData
                });
                return report({ action: 'merged', matchedWith: candidate.id, event: updated });
            }
        }
    }

    // 3. Se não houver correspondência, cria novo registo
    const created = await prisma.event.create({
        data: eventData
    });
    return report({ action: 'created', event: created });
}
