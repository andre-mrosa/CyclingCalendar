import { getEventDiscipline } from './eventClassifier.js';
import { isSameEvent } from '../lib/merging/eventMatcher.js';

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

    for (let i = 0; i < events.length; i++) {
        if (processed.has(i)) continue;
        const current = events[i];
        let bestEvent = current;
        let bestScore = getInfoScore(current);
        const duplicates = [current];

        for (let j = i + 1; j < events.length; j++) {
            if (processed.has(j)) continue;
            const candidate = events[j];
            if (current.date === candidate.date && isSameEvent(current, candidate)) {
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
            bestEvent._allIds = duplicates.map(d => d.id);
            const allExtraLinks = [];
            const allEscaloes = new Set();
            
            duplicates.forEach(d => {
                if (d.extraLinks) allExtraLinks.push(...d.extraLinks);
                if (d.escaloes) d.escaloes.forEach(e => allEscaloes.add(e));
                if (!bestEvent.distrito && d.distrito) bestEvent.distrito = d.distrito;
                if (!bestEvent.regiao && d.regiao) bestEvent.regiao = d.regiao;
                if (!bestEvent.ambito && d.ambito) bestEvent.ambito = d.ambito;
            });
            
            const uniqueLinksMap = new Map();
            if (bestEvent.extraLinks) bestEvent.extraLinks.forEach(l => uniqueLinksMap.set(l.link, l));
            allExtraLinks.forEach(l => uniqueLinksMap.set(l.link, l));
            bestEvent.extraLinks = Array.from(uniqueLinksMap.values());
            
            if (allEscaloes.size > 0) bestEvent.escaloes = Array.from(allEscaloes);
            bestEvent._mergedSources = duplicates.map(d => d.source);
        } else {
            bestEvent._allIds = [bestEvent.id];
        }

        bestEvent.tag = getEventDiscipline(bestEvent);
        merged.push(bestEvent);
    }
    return merged;
}
