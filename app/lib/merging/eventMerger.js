import { isSameEvent } from './eventMatcher.js';

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
    const extraLinks = mergeExtraLinks(existing.extraLinks, incoming.extraLinks);
    const escaloes = mergeEscaloes(existing.escaloes, incoming.escaloes);

    // Priorizar data multi-dia se uma delas tiver intervalo " a "
    let date = existing.date || incoming.date;
    if (incoming.date && incoming.date.includes(' a ') && !existing.date?.includes(' a ')) {
        date = incoming.date;
    }

    // Localização mais completa
    let details = existing.details;
    if (!details || details === 'A definir' || (incoming.details && incoming.details.length > details.length)) {
        details = incoming.details;
    }

    // Programa e Documentos: se ambos tiverem conteúdo útil, podemos enriquecer
    let programa = existing.programa || incoming.programa;
    if (existing.programa && incoming.programa && existing.programa !== incoming.programa) {
        // Se a FPC tem downloads e a Cabreira tem programa, combina ambos
        if (existing.source?.includes('FPC') && incoming.source?.includes('Cabreira')) {
            programa = `${incoming.programa}<br/><br/>${existing.programa}`;
        }
    }

    return {
        title: existing.title || incoming.title,
        date: date,
        sortDate: existing.sortDate || incoming.sortDate,
        details: details,
        tag: existing.tag || incoming.tag,
        ambito: existing.ambito && existing.ambito !== 'Nacional' ? existing.ambito : (incoming.ambito || existing.ambito),
        escaloes: escaloes,
        licenca: existing.licenca && existing.licenca !== 'Todas' ? existing.licenca : (incoming.licenca || existing.licenca),
        regiao: existing.regiao && existing.regiao !== 'Todas' ? existing.regiao : (incoming.regiao || existing.regiao),
        distrito: existing.distrito && existing.distrito !== 'Todos' ? existing.distrito : (incoming.distrito || existing.distrito),
        source: sources,
        link: existing.link || incoming.link,
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
    };
}

/**
 * Salva um novo evento ou faz merge inteligente se a prova já existir na base de dados
 */
export async function saveOrMergeEvent(prisma, eventData) {
    if (!eventData || !eventData.id) return null;

    // 1. Procurar por ID exato
    const existingById = await prisma.event.findUnique({
        where: { id: eventData.id }
    });

    if (existingById) {
        const mergedData = mergeEventRecords(existingById, eventData);
        const updated = await prisma.event.update({
            where: { id: existingById.id },
            data: mergedData
        });
        return { action: 'updated', event: updated };
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
                return { action: 'merged', matchedWith: candidate.id, event: updated };
            }
        }
    }

    // 3. Se não houver correspondência, cria novo registo
    const created = await prisma.event.create({
        data: eventData
    });
    return { action: 'created', event: created };
}
