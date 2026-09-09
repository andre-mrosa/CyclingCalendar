import { getEventDiscipline } from './eventClassifier.js';
import { isSameEvent } from '../lib/merging/eventMatcher.js';
import { normalizeText } from '../lib/merging/eventMatcher.js';

// Already aggregated sources may contain FPC without being an original FPC row.
// Allow only exact open-ride identities at the same location in that case.
function sameOpenRide(a, b) {
    if (a.ambito !== 'Prova Aberta' || b.ambito !== 'Prova Aberta') return false;
    if (a.id?.startsWith('fpc-') && b.id?.startsWith('fpc-')) return false;
    if ([a, b].some(e => e.source?.includes('Quarentena'))) return false;
    const town = event => normalizeText((event.details || '').split('|')[0]);
    const location = town(a);
    if (!location || location === 'portugal' || location !== town(b)) return false;
    const identity = event => {
        let title = normalizeText((event.title || '').replace(/^ngps\s*[-–:]?\s*/i, '').replace(/\bgf\b/gi, 'granfondo'));
        if (title.endsWith(' ' + location)) title = title.slice(0, -(location.length + 1));
        return title;
    };
    return identity(a).length > 5 && identity(a) === identity(b);
}

export function mergeEvents(events) {
    const merged = [];
    
    const getInfoScore = (e) => {
        let score = 0;
        if (e.details && e.details !== 'A definir') score += 2;
        if (e.escaloes && e.escaloes.length > 0) score += 2;
        if (e.extraLinks && e.extraLinks.length > 0) score += 3;
        if (e.distrito && e.distrito !== 'Todos') score += 1;
        if (e.regiao && e.regiao !== 'Todas') score += 1;
        if (e.ambito && e.ambito !== 'Todos') score += 1;
        if (e.tag) score += 1;
        return score;
    };

    const processed = new Set();
    const calendarDays = events.map(event => {
        const date = new Date(event.sortDate);
        return event.sortDate && !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null;
    });

    for (let i = 0; i < events.length; i++) {
        if (processed.has(i)) continue;
        const current = events[i];
        let bestEvent = current;
        let bestScore = getInfoScore(current);
        const duplicates = [current];

        for (let j = i + 1; j < events.length; j++) {
            if (processed.has(j)) continue;
            const candidate = events[j];
            const sameDay = calendarDays[i] && calendarDays[i] === calendarDays[j];
            if ((sameDay || (current.date && current.date === candidate.date)) && (isSameEvent(current, candidate) || (sameDay && sameOpenRide(current, candidate)))) {
                duplicates.push(candidate);
                processed.add(j);
                const score = getInfoScore(candidate);
                if (score > bestScore) {
                    bestScore = score;
                    bestEvent = candidate;
                }
            }
        }
        
        if (duplicates.length > 1) {
            bestEvent = { ...bestEvent };
            bestEvent._allIds = [...new Set(duplicates.flatMap(d => [d.id, ...(d._allIds || [])]))];
            const allExtraLinks = [];
            const allEscaloes = new Set();
            
            duplicates.forEach(d => {
                if (d.link) allExtraLinks.push({ label: d.source || d.title, link: d.link });
                if (d.extraLinks) allExtraLinks.push(...d.extraLinks);
                if (d.escaloes) d.escaloes.forEach(e => allEscaloes.add(e));
                if (!bestEvent.distrito && d.distrito) bestEvent.distrito = d.distrito;
                if (!bestEvent.regiao && d.regiao) bestEvent.regiao = d.regiao;
                if (!bestEvent.ambito && d.ambito) bestEvent.ambito = d.ambito;
                for (const field of ['registrationOpensAt', 'registrationClosesAt', 'prices']) {
                    if (!bestEvent[field] && d[field]) bestEvent[field] = d[field];
                }
            });
            
            const uniqueLinksMap = new Map();
            if (bestEvent.extraLinks) bestEvent.extraLinks.forEach(l => uniqueLinksMap.set(l.link, l));
            allExtraLinks.forEach(l => uniqueLinksMap.set(l.link, l));
            bestEvent.extraLinks = Array.from(uniqueLinksMap.values());
            
            if (allEscaloes.size > 0) bestEvent.escaloes = Array.from(allEscaloes);
            bestEvent._mergedSources = [...new Set(duplicates.flatMap(d => d._mergedSources || [d.source]).filter(Boolean))];
        } else {
            bestEvent = { ...bestEvent, _allIds: [...new Set([bestEvent.id, ...(bestEvent._allIds || [])])] };
        }

        bestEvent.tag = getEventDiscipline(bestEvent);
        merged.push(bestEvent);
    }
    return merged;
}
