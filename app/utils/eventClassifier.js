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
    return getEventRaceTypes(eventOrTitle, details)[0] || 'Estrada';
}

export const RACE_TAXONOMY = [
    {
        discipline: 'Estrada',
        specialities: ['Estrada Fundo', 'Estrada Circuito', 'Estrada CRI / ITT', 'Estrada CRE / TTT', 'Granfondo']
    },
    {
        discipline: 'BTT',
        specialities: ['BTT XCO', 'BTT XCM / Maratona', 'BTT XCC', 'BTT XCE', 'BTT XCR', 'BTT DHI / DHU', 'BTT Enduro']
    },
    { discipline: 'Gravel', specialities: [] },
    { discipline: 'Ciclocrosse', specialities: [] },
    { discipline: 'Pista', specialities: [] },
    { discipline: 'BMX', specialities: [] },
    { discipline: 'Paraciclismo', specialities: [] },
    { discipline: 'Passeio / Lazer', specialities: [] },
    { discipline: 'E-Sports', specialities: [] }
];

export function getRaceTypeFamily(raceType = '') {
    const group = RACE_TAXONOMY.find(item => item.discipline === raceType || item.specialities.includes(raceType));
    if (group) return group.discipline;
    if (raceType.startsWith('Estrada')) return 'Estrada';
    if (raceType.startsWith('BTT')) return 'BTT';
    return raceType;
}

import { getCuratedDiscipline } from './curatedDisciplines.js';

/**
 * Returns every speciality represented by an event. This is intentionally an
 * array: championship weekends can legitimately contain XCO and XCC, or CRI
 * and Fundo, and must be discoverable through either speciality.
 */
export function getEventRaceTypes(eventOrTitle, details = '') {
    let title = '';
    let det = '';
    let existingTag = '';
    let description = '';

    if (typeof eventOrTitle === 'object' && eventOrTitle !== null) {
        title = eventOrTitle.title || '';
        det = eventOrTitle.details || '';
        existingTag = eventOrTitle.tag || '';
        description = eventOrTitle.description || '';
    } else {
        title = String(eventOrTitle || '');
        det = String(details || '');
    }

    // 0. Curated Registry (100% verified ground truth for non-standard / ambiguous event names)
    const curated = getCuratedDiscipline(title, typeof eventOrTitle === 'object' ? eventOrTitle.id || '' : '');
    if (curated) {
        return [curated];
    }

    // 0.1 UCI & FPC Official Class Code Prefix System
    // (1.x = Estrada, 2.x = BTT, 3.x = Pista, 4.x = Ciclocrosse, 5.x = BMX, 6.x = Gravel)
    const fpcClassPrefix = det.match(/\b([1-6])\.\d{2}/);
    if (fpcClassPrefix) {
        const prefix = fpcClassPrefix[1];
        if (prefix === '1') return ['Estrada'];
        if (prefix === '2') return ['BTT'];
        if (prefix === '3') return ['Pista'];
        if (prefix === '4') return ['Ciclocrosse'];
        if (prefix === '5') return ['BMX'];
        if (prefix === '6') return ['Gravel'];
    }

    const titleText = title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const text = `${title} ${det} ${existingTag}`
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '');
    const extendedText = `${text} ${description
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')}`;
    const types = [];
    const add = value => {
        if (!types.includes(value)) types.push(value);
    };

    if (/\bxco\b/.test(extendedText)) add('BTT XCO');
    if (/\bxcm\b|maratona\s+(?:de\s+)?btt|meia[- ]maratona\s+(?:de\s+)?btt|raid\s+btt/.test(extendedText)) add('BTT XCM / Maratona');
    if (/\bxcc\b/.test(extendedText)) add('BTT XCC');
    if (/\bxce\b/.test(extendedText)) add('BTT XCE');
    if (/\bxcr\b/.test(extendedText)) add('BTT XCR');
    if (/\b(dhi|dhu|downhill)\b/.test(extendedText)) add('BTT DHI / DHU');
    if (/\benduro\b/.test(extendedText)) add('BTT Enduro');
    if (/\b(urban\s*race|resistencia\s*urbana|resistência\s*urbana)\b/.test(extendedText)) add('BTT XCO');
    if (/\b(trilhos?|raid|geotour|bike\s*challenge|racenature|race\s*nature|transportugal|iron\s*rider|gps\s*epic|maratona|meia[- ]maratona)\b/.test(extendedText)) add('BTT XCM / Maratona');
    if (types.length > 0) return types;

    // Standalone disciplines take precedence over generic words such as
    // "circuito" (e.g. "Circuito Nacional de Gravel").
    if (/\bgravel\b/.test(titleText) || (/\bgravel\b/.test(extendedText) && !/\bbtt\b|\bmtb\b/.test(extendedText))) return ['Gravel'];
    if (/ciclocross|ciclo-cross|\bcx\b/.test(extendedText)) return ['Ciclocrosse'];
    const isTrack = /\bpista\b|velodromo/.test(text);
    const isParacycling = /paraciclismo/.test(text);
    if (isTrack || isParacycling) {
        if (isTrack) add('Pista');
        if (isParacycling) add('Paraciclismo');
        return types;
    }
    if (/\bbmx\b|pump\s+track/.test(extendedText)) return ['BMX'];
    if (/ciclismo\s+virtual|e-sports|esports/.test(text)) return ['E-Sports'];
    if (/granfondo|gran\s+fondo|mediofondo|minifondo/.test(text)) return ['Granfondo'];

    if (/\bbtt\b|\bmtb\b|mountain\s*bike|\burban\s*race\b|\bresist[eê]ncia\b|\btrilhos?\b|\braid\b|\bgeotour\b|\bbike\s*challenge\b|\bracenature\b|\btransportugal\b/.test(extendedText)) return ['BTT'];

    if (/\bcri\b|\bitt\b|contra[- ]?relogio\s+individual|individual\s+time\s+trial/.test(text)) add('Estrada CRI / ITT');
    if (/\bcre\b|\bttt\b|contra[- ]?relogio\s+por\s+equipas|team\s+time\s+trial/.test(text)) add('Estrada CRE / TTT');
    if (/\bcircuito\b|criterium|criterio/.test(text)) add('Estrada Circuito');
    if (/\bfundo\b|road\s+race/.test(text)) add('Estrada Fundo');
    if (types.length > 0) return types;

    const storedFamily = getRaceTypeFamily(existingTag);
    if (RACE_TAXONOMY.some(group => group.discipline === storedFamily)) return [storedFamily];
    if (/passeio|cicloturismo|turismo\s+em\s+bicicleta|\brota\b/.test(titleText)) return ['Passeio / Lazer'];

    return ['Estrada'];
}

export function getEventRaceType(eventOrTitle, details = '') {
    return getEventRaceTypes(eventOrTitle, details)[0];
}

export function getEventDisciplineFamilies(eventOrTitle, details = '') {
    return [...new Set(getEventRaceTypes(eventOrTitle, details).map(getRaceTypeFamily).filter(Boolean))];
}
