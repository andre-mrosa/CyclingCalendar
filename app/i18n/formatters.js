export const MONTH_ABBRS = {
    pt: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
    en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
    es: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
    fr: ['JAN', 'FÉV', 'MAR', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛ', 'SEP', 'OCT', 'NOV', 'DÉC'],
};

export const MONTH_FULL = {
    pt: ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
    en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
    es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
    fr: ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'],
};

export function formatMonthAbbr(monthPt, lang = 'pt') {
    if (!monthPt) return '';
    const cleanMonth = String(monthPt).trim().toUpperCase();
    const idx = MONTH_ABBRS.pt.indexOf(cleanMonth);
    if (idx === -1) return monthPt;
    const target = MONTH_ABBRS[lang] || MONTH_ABBRS.pt;
    return target[idx] || monthPt;
}

export function translateDateString(dateStr, lang = 'pt') {
    if (!dateStr || lang === 'pt') return dateStr;
    let res = String(dateStr);
    const targetAbbr = MONTH_ABBRS[lang] || MONTH_ABBRS.en;
    const targetFull = MONTH_FULL[lang] || MONTH_FULL.en;
    
    // Replace full and abbreviated months
    MONTH_ABBRS.pt.forEach((m, idx) => {
        res = res.replace(new RegExp('\\b' + m + '\\b', 'gi'), targetAbbr[idx]);
    });
    MONTH_FULL.pt.forEach((m, idx) => {
        res = res.replace(new RegExp('\\b' + m + '\\b', 'gi'), targetFull[idx]);
    });

    // Translate date connectors (a, e, até)
    if (lang === 'fr') {
        res = res.replace(/\s+a\s+/gi, ' au ');
        res = res.replace(/\s+e\s+/gi, ' et ');
        res = res.replace(/\s+até\s+/gi, " jusqu'au ");
    } else if (lang === 'en') {
        res = res.replace(/\s+a\s+/gi, ' to ');
        res = res.replace(/\s+e\s+/gi, ' & ');
        res = res.replace(/\s+até\s+/gi, ' until ');
    } else if (lang === 'es') {
        res = res.replace(/\s+a\s+/gi, ' a ');
        res = res.replace(/\s+e\s+/gi, ' y ');
        res = res.replace(/\s+até\s+/gi, ' hasta ');
    }

    return res;
}

const ESCALAO_MAP = {
    'elite': { en: 'Elite', es: 'Élite', fr: 'Élite' },
    'elite amador': { en: 'Amateur Elite', es: 'Élite Amateur', fr: 'Élite Amateur' },
    'sub-23': { en: 'Under-23', es: 'Sub-23', fr: 'Moins de 23 ans' },
    'sub-19 (juniores)': { en: 'Under-19 (Juniors)', es: 'Sub-19 (Júniors)', fr: 'Moins de 19 ans (Juniors)' },
    'sub-19': { en: 'Under-19', es: 'Sub-19', fr: 'Moins de 19 ans' },
    'juniores': { en: 'Juniors', es: 'Júniors', fr: 'Juniors' },
    'sub-17 (cadetes)': { en: 'Under-17 (Cadets)', es: 'Sub-17 (Cadetes)', fr: 'Moins de 17 ans (Cadets)' },
    'sub-17': { en: 'Under-17', es: 'Sub-17', fr: 'Moins de 17 ans' },
    'cadetes': { en: 'Cadets', es: 'Cadetes', fr: 'Cadets' },
    'sub-15 (juvenis)': { en: 'Under-15 (Youth)', es: 'Sub-15 (Infantiles)', fr: 'Moins de 15 ans (Minimes)' },
    'sub-15': { en: 'Under-15', es: 'Sub-15', fr: 'Moins de 15 ans' },
    'juvenis': { en: 'Youth', es: 'Infantiles', fr: 'Minimes' },
    'masters / veteranos': { en: 'Masters / Veterans', es: 'Masters / Veteranos', fr: 'Masters / Vétérans' },
    'masters': { en: 'Masters', es: 'Masters', fr: 'Masters' },
    'veteranos': { en: 'Veterans', es: 'Veteranos', fr: 'Vétérans' },
    'femininas': { en: 'Women', es: 'Féminas', fr: 'Femmes' },
    'escolas': { en: 'Youth Schools', es: 'Escuelas', fr: 'Écoles de cyclisme' },
    'profissional (uci)': { en: 'Professional (UCI)', es: 'Profesional (UCI)', fr: 'Professionnel (UCI)' },
    'todos (aberto)': { en: 'All (Open)', es: 'Todos (Abierto)', fr: 'Tous (Ouvert)' },
    'geral / vários': { en: 'General / Various', es: 'General / Varios', fr: 'Général / Divers' },
    'geral / varios': { en: 'General / Various', es: 'General / Varios', fr: 'Général / Divers' },
    'geral/vários': { en: 'General / Various', es: 'General / Varios', fr: 'Général / Divers' },
    'geral/varios': { en: 'General / Various', es: 'General / Varios', fr: 'Général / Divers' },
    'geral': { en: 'General', es: 'General', fr: 'Général' },
    'vários': { en: 'Various', es: 'Varios', fr: 'Divers' },
    'varios': { en: 'Various', es: 'Varios', fr: 'Divers' },
    'todos': { en: 'All', es: 'Todos', fr: 'Tous' }
};

export function translateEscalao(name, lang = 'pt') {
    if (!name || lang === 'pt') return name;
    const clean = String(name).trim().toLowerCase();
    if (ESCALAO_MAP[clean] && ESCALAO_MAP[clean][lang]) {
        return ESCALAO_MAP[clean][lang];
    }
    const norm = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (ESCALAO_MAP[norm] && ESCALAO_MAP[norm][lang]) {
        return ESCALAO_MAP[norm][lang];
    }
    return name;
}

const AMBITO_MAP = {
    'taça de portugal': { en: 'Portuguese Cup', es: 'Copa de Portugal', fr: 'Coupe du Portugal' },
    'taças de portugal': { en: 'Portuguese Cup', es: 'Copa de Portugal', fr: 'Coupe du Portugal' },
    'taça': { en: 'Portuguese Cup', es: 'Copa', fr: 'Coupe' },
    'campeonato nacional': { en: 'National Championship', es: 'Campeonato Nacional', fr: 'Championnat National' },
    'campeonatos nacionais': { en: 'National Championships', es: 'Campeonatos Nacionales', fr: 'Championnats Nationaux' },
    'nacional': { en: 'National', es: 'Nacional', fr: 'National' },
    'regional': { en: 'Regional', es: 'Regional', fr: 'Régional' },
    'regionais': { en: 'Regional', es: 'Regional', fr: 'Régional' },
    'internacional': { en: 'International', es: 'Internacional', fr: 'International' },
    'internacionais': { en: 'International', es: 'Internacional', fr: 'International' },
    'prova aberta': { en: 'Open Race', es: 'Prueba Abierta', fr: 'Épreuve Ouverte' },
    'lazer': { en: 'Leisure', es: 'Ocio', fr: 'Loisir' },
    'todos': { en: 'All', es: 'Todos', fr: 'Tous' }
};

export function translateAmbito(name, lang = 'pt') {
    if (!name || lang === 'pt') return name;
    const clean = String(name).trim().toLowerCase();
    if (AMBITO_MAP[clean] && AMBITO_MAP[clean][lang]) {
        return AMBITO_MAP[clean][lang];
    }
    const norm = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (AMBITO_MAP[norm] && AMBITO_MAP[norm][lang]) {
        return AMBITO_MAP[norm][lang];
    }
    if (clean.includes('taça') || norm.includes('taca')) return AMBITO_MAP['taça de portugal'][lang] || name;
    if (clean.includes('campeonato')) return AMBITO_MAP['campeonato nacional'][lang] || name;
    if (clean.includes('regional')) return AMBITO_MAP['regional'][lang] || name;
    if (clean.includes('nacional')) return AMBITO_MAP['nacional'][lang] || name;
    if (clean.includes('internacional')) return AMBITO_MAP['internacional'][lang] || name;
    return name;
}

const LICENCA_MAP = {
    'competição': { en: 'Competition', es: 'Competición', fr: 'Compétition' },
    'competicao': { en: 'Competition', es: 'Competición', fr: 'Compétition' },
    'cpt / lazer': { en: 'CPT / Leisure', es: 'CPT / Ocio', fr: 'CPT / Loisir' },
    'cpt': { en: 'CPT / Leisure', es: 'CPT / Ocio', fr: 'CPT / Loisir' },
    'lazer': { en: 'Leisure', es: 'Ocio', fr: 'Loisir' },
    'todas': { en: 'All', es: 'Todas', fr: 'Toutes' }
};

export function translateLicenca(name, lang = 'pt') {
    if (!name || lang === 'pt') return name;
    const clean = String(name).trim().toLowerCase();
    if (LICENCA_MAP[clean] && LICENCA_MAP[clean][lang]) {
        return LICENCA_MAP[clean][lang];
    }
    const norm = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (LICENCA_MAP[norm] && LICENCA_MAP[norm][lang]) {
        return LICENCA_MAP[norm][lang];
    }
    if (clean.includes('compet')) return LICENCA_MAP['competição'][lang] || name;
    if (clean.includes('cpt') || clean.includes('lazer')) return LICENCA_MAP['cpt / lazer'][lang] || name;
    return name;
}

const TAG_MAP = {
    'estrada': { en: 'Road', es: 'Carretera', fr: 'Route' },
    'estrada linha': { en: 'Road', es: 'Carretera', fr: 'Route' },
    'estrada circuito': { en: 'Road Circuit', es: 'Circuito Carretera', fr: 'Circuit Route' },
    'pista': { en: 'Track', es: 'Pista', fr: 'Piste' },
    'btt': { en: 'MTB', es: 'BTT', fr: 'VTT' },
    'btt xco': { en: 'MTB XCO', es: 'BTT XCO', fr: 'VTT XCO' },
    'btt xcm': { en: 'MTB XCM', es: 'BTT XCM', fr: 'VTT XCM' },
    'btt xce': { en: 'MTB XCE', es: 'BTT XCE', fr: 'VTT XCE' },
    'btt xcc': { en: 'MTB XCC', es: 'BTT XCC', fr: 'VTT XCC' },
    'btt xcr': { en: 'MTB XCR', es: 'BTT XCR', fr: 'VTT XCR' },
    'paraciclismo': { en: 'Para-cycling', es: 'Paraciclismo', fr: 'Paracyclisme' },
    'btt dhi': { en: 'MTB DHI', es: 'BTT DHI', fr: 'VTT DHI' },
    'btt dhi/dhu': { en: 'MTB DHI/DHU', es: 'BTT DHI/DHU', fr: 'VTT DHI/DHU' },
    'btt enduro': { en: 'MTB Enduro', es: 'BTT Enduro', fr: 'VTT Enduro' },
    'ciclocrosse': { en: 'Cyclocross', es: 'Ciclocross', fr: 'Cyclo-cross' },
    'ciclocross': { en: 'Cyclocross', es: 'Ciclocross', fr: 'Cyclo-cross' },
    'gravel': { en: 'Gravel', es: 'Gravel', fr: 'Gravel' },
    'bmx': { en: 'BMX', es: 'BMX', fr: 'BMX' },
    'enduro': { en: 'Enduro', es: 'Enduro', fr: 'Enduro' },
    'passeio / lazer': { en: 'Ride / Leisure', es: 'Paseo / Ocio', fr: 'Balade / Loisir' },
    'passeio / granfondo': { en: 'Ride / Granfondo', es: 'Paseo / Granfondo', fr: 'Balade / Granfondo' },
    'passeio': { en: 'Ride', es: 'Paseo', fr: 'Balade' },
    'ciclismo para todos': { en: 'Cycling for All', es: 'Ciclismo para Todos', fr: 'Cyclisme pour Tous' },
    'ciclismo': { en: 'Cycling', es: 'Ciclismo', fr: 'Cyclisme' },
    'evento': { en: 'Event', es: 'Evento', fr: 'Événement' },
    'granfondo': { en: 'Granfondo', es: 'Granfondo', fr: 'Granfondo' },
    'mediofondo': { en: 'Mediofondo', es: 'Mediofondo', fr: 'Mediofondo' },
    'minifondo': { en: 'Minifondo', es: 'Minifondo', fr: 'Minifondo' }
};

export function translateTag(name, lang = 'pt') {
    if (!name || lang === 'pt') return name;
    const clean = String(name).trim().toLowerCase();
    if (TAG_MAP[clean] && TAG_MAP[clean][lang]) {
        return TAG_MAP[clean][lang];
    }
    const norm = clean.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (TAG_MAP[norm] && TAG_MAP[norm][lang]) {
        return TAG_MAP[norm][lang];
    }
    return name;
}
