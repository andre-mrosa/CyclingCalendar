export function hasNationalChampionshipTitle(title = '') {
    const text = title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return !/\b(?:inter[ -]?)?regiona(?:l|is)\b/.test(text) &&
        /\b(?:campeonatos?\s+(?:naciona(?:l|is)|de\s+portugal)|camp\.\s*naciona(?:l|is)|cn\b)/.test(text);
}

export function isOfficialNationalChampionship(event) {
    const isFPC = (event.source || '').split(',').some(source => source.trim() === 'FPC');
    // Only titles and the FPC class column establish championship status.
    // Descriptions often advertise a separate championship on the same weekend.
    const eventClass = (event.details || '').split('|').pop().trim();
    return isFPC && (hasNationalChampionshipTitle(event.title) || /^(?:Pista\s+)?CN$/i.test(eventClass));
}

export function isStageRace(event) {
    if (!event) return false;
    const title = (event.title || '').toLowerCase();
    // Championship weekends span categories/disciplines, not race stages.
    if (hasNationalChampionshipTitle(title)) return false;
    const details = (event.details || '').toLowerCase();
    const rawDate = (event.date || '').toLowerCase();
    const programa = (event.programa || '').toLowerCase();

    // 1. Explicit multi-stage keywords in title or details
    const stageKeywords = [
        'etapa', 'etapas', 'por etapas', 'stage race', 'stages',
        'volta a ', 'volta ao ', 'volta à ', 'volta de ', 'volta ao concelho',
        'gp ', 'g.p.', 'grande prémio', 'grande premio',
        'challenge', '2 dias de', '3 dias de', '4 dias de', '5 dias de',
        'two days', 'three days', 'multi-stage'
    ];
    if (stageKeywords.some(k => title.includes(k) || details.includes(k))) {
        return true;
    }

    // 2. Explicit stages mentioned in programa (e.g. "1ª Etapa" and "2ª Etapa" or "Prólogo")
    if (programa && programa.length > 40) {
        const hasStage1 = /etapa\s*1|1[ªa]\s*etapa|pr[óo]logo/i.test(programa);
        const hasStage2 = /etapa\s*2|2[ªa]\s*etapa/i.test(programa);
        if (hasStage1 && hasStage2) {
            return true;
        }
    }

    // 3. Multi-day span >= 3 days (e.g., "15 a 19 JUL")
    const rangeMatch = rawDate.match(/(\d{1,2})\s*(?:[a-zà-ú]{3,9})?\s*(?:a|-|e|até)\s*(\d{1,2})\s+([a-zà-ú]{3,9})/i);
    if (rangeMatch) {
        const d1 = parseInt(rangeMatch[1], 10);
        const d2 = parseInt(rangeMatch[2], 10);
        if (!isNaN(d1) && !isNaN(d2) && d2 > d1) {
            const diffDays = d2 - d1;
            const isGranfondoOrCup = /granfondo|mediofondo|minifondo|taça|taca|maratona|xco|xcm|dhi|enduro/i.test(title);
            if (!isGranfondoOrCup && diffDays >= 2) {
                return true;
            }
            if (diffDays >= 3) {
                return true;
            }
        }
    }

    return false;
}

export function getEventDiscipline(eventOrTitle, details = '') {
    let title = '';
    let det = '';
    let existingTag = '';

    if (typeof eventOrTitle === 'object' && eventOrTitle !== null) {
        title = eventOrTitle.title || '';
        det = (eventOrTitle.details || '') + ' ' + (eventOrTitle.description || '');
        existingTag = eventOrTitle.tag || '';
    } else {
        title = String(eventOrTitle || '');
        det = String(details || '');
    }

    const lower = (title + ' ' + det).toLowerCase();
    const titleLower = title.toLowerCase();

    // 1. Gravel
    if (titleLower.includes('gravel') || (/\bgravel\b/i.test(lower) && !lower.includes('btt'))) {
        return 'Gravel';
    }

    // 2. Granfondo / Mediofondo / Minifondo (Estrada)
    if (titleLower.includes('granfondo') || titleLower.includes('gran fondo') || titleLower.includes('mediofondo') || titleLower.includes('minifondo')) {
        return 'Estrada';
    }

    // 3. Specific BTT Sub-disciplines
    if (/\bxce\b/i.test(lower)) return 'BTT XCE';
    if (/\bxcc\b/i.test(lower)) return 'BTT XCC';
    if (/\bxcr\b/i.test(lower)) return 'BTT XCR';
    if (titleLower.includes('xco') || /\bxco\b/i.test(lower)) return 'BTT XCO';
    if (titleLower.includes('xcm') || titleLower.includes('maratona btt') || titleLower.includes('meia-maratona btt') || titleLower.includes('raid btt') || /\bxcm\b/i.test(lower)) return 'BTT XCM';
    if (/\benduro\b/i.test(lower)) return 'BTT Enduro';
    if (/\b(dhi|dhu|downhill)\b/i.test(lower)) return 'BTT DHI';

    if (/paraciclismo/i.test(lower)) return 'Paraciclismo';
    if (/ciclismo virtual|e-sports/i.test(lower)) return 'E-Sports';

    // 4. Pista
    if (/\bpista\b|vel[oó]dromo/i.test(lower)) return 'Pista';

    // 5. Ciclocrosse
    if (/ciclocross|\bcx\b/i.test(lower)) return 'Ciclocrosse';

    // 6. BMX
    if (/\bbmx\b|pump track/i.test(lower)) return 'BMX';

    // 7. General BTT
    if (titleLower.includes('btt') || titleLower.includes('btt xcm') || titleLower.includes('btt xco') || titleLower.includes('btt dhi')) {
        return 'BTT';
    }

    // 8. Estrada
    if (titleLower.includes('estrada') || titleLower.includes('volta a') || titleLower.includes('volta ao') || titleLower.includes('clássica') || titleLower.includes('classica') || titleLower.includes('circuito') || titleLower.includes('prémio') || titleLower.includes('premio') || titleLower.includes('contra-relógio') || titleLower.includes('crono')) {
        return 'Estrada';
    }

    // 9. Passeio / Lazer
    if (titleLower.includes('passeio') || titleLower.includes('cicloturismo') || titleLower.includes('cpt') || titleLower.includes('rota')) {
        return 'Passeio / Lazer';
    }

    // 10. Fallback to existing valid tag if known
    if (existingTag && existingTag !== 'Evento' && existingTag !== 'Ciclismo' && existingTag !== 'Passeio / Granfondo') {
        return existingTag;
    }

    if (lower.includes('estrada') && !lower.includes('btt')) return 'Estrada';
    if (lower.includes('btt') && !lower.includes('estrada')) return 'BTT';

    return 'Estrada';
}
