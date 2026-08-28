export function isStageRace(event) {
    if (!event) return false;
    const title = (event.title || '').toLowerCase();
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
    if (titleLower.includes('xco') || /\bxco\b/i.test(lower)) return 'BTT XCO';
    if (titleLower.includes('xcm') || titleLower.includes('maratona btt') || titleLower.includes('meia-maratona btt') || titleLower.includes('raid btt') || /\bxcm\b/i.test(lower)) return 'BTT XCM';
    if (titleLower.includes('enduro') || /\benduro\b/i.test(titleLower)) return 'BTT Enduro';
    if (titleLower.includes('dhi') || titleLower.includes('dhu') || titleLower.includes('downhill')) return 'BTT DHI';

    // 4. Pista
    if (titleLower.includes('pista') || titleLower.includes('velódromo') || titleLower.includes('velodromo')) return 'Pista';

    // 5. Ciclocrosse
    if (titleLower.includes('ciclocross') || titleLower.includes('ciclocrosse') || /\bcx\b/i.test(titleLower)) return 'Ciclocrosse';

    // 6. BMX
    if (titleLower.includes('bmx') || titleLower.includes('pump track')) return 'BMX';

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