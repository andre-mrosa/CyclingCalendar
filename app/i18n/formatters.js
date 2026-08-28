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
    MONTH_ABBRS.pt.forEach((m, idx) => {
        res = res.replace(new RegExp('\\b' + m + '\\b', 'gi'), targetAbbr[idx]);
    });
    MONTH_FULL.pt.forEach((m, idx) => {
        res = res.replace(new RegExp('\\b' + m + '\\b', 'gi'), targetFull[idx]);
    });
    return res;
}

const ESCALAO_MAP = {
    'Elite': { en: 'Elite', es: 'Élite', fr: 'Élite' },
    'Elite Amador': { en: 'Amateur Elite', es: 'Élite Amateur', fr: 'Élite Amateur' },
    'Sub-23': { en: 'Under-23', es: 'Sub-23', fr: 'Moins de 23 ans' },
    'Sub-19 (Juniores)': { en: 'Under-19 (Juniors)', es: 'Sub-19 (Júniors)', fr: 'Moins de 19 ans (Juniors)' },
    'Sub-17 (Cadetes)': { en: 'Under-17 (Cadets)', es: 'Sub-17 (Cadetes)', fr: 'Moins de 17 ans (Cadets)' },
    'Sub-15 (Juvenis)': { en: 'Under-15 (Youth)', es: 'Sub-15 (Infantiles)', fr: 'Moins de 15 ans (Minimes)' },
    'Masters / Veteranos': { en: 'Masters / Veterans', es: 'Masters / Veteranos', fr: 'Masters / Vétérans' },
    'Masters': { en: 'Masters', es: 'Masters', fr: 'Masters' },
    'Veteranos': { en: 'Veterans', es: 'Veteranos', fr: 'Vétérans' },
    'Femininas': { en: 'Women', es: 'Féminas', fr: 'Femmes' },
    'Escolas': { en: 'Youth Schools', es: 'Escuelas', fr: 'Écoles de cyclisme' },
    'Profissional (UCI)': { en: 'Professional (UCI)', es: 'Profesional (UCI)', fr: 'Professionnel (UCI)' },
    'Todos (Aberto)': { en: 'All (Open)', es: 'Todos (Abierto)', fr: 'Tous (Ouvert)' },
    'Geral / Vários': { en: 'General / Various', es: 'General / Varios', fr: 'Général / Divers' },
    'Geral': { en: 'General', es: 'General', fr: 'Général' },
    'Vários': { en: 'Various', es: 'Varios', fr: 'Divers' },
    'Todos': { en: 'All', es: 'Todos', fr: 'Tous' }
};

export function translateEscalao(name, lang = 'pt') {
    if (!name || lang === 'pt') return name;
    const clean = String(name).trim();
    if (ESCALAO_MAP[clean] && ESCALAO_MAP[clean][lang]) {
        return ESCALAO_MAP[clean][lang];
    }
    return name;
}

const AMBITO_MAP = {
    'Taça de Portugal': { en: 'Portuguese Cup', es: 'Copa de Portugal', fr: 'Coupe du Portugal' },
    'Campeonato Nacional': { en: 'National Championship', es: 'Campeonato Nacional', fr: 'Championnat National' },
    'Nacional': { en: 'National', es: 'Nacional', fr: 'National' },
    'Regional': { en: 'Regional', es: 'Regional', fr: 'Régional' },
    'Internacional': { en: 'International', es: 'Internacional', fr: 'International' },
    'Prova Aberta': { en: 'Open Race', es: 'Prueba Abierta', fr: 'Épreuve Ouverte' },
    'Lazer': { en: 'Leisure', es: 'Ocio', fr: 'Loisir' },
    'Todos': { en: 'All', es: 'Todos', fr: 'Tous' }
};

export function translateAmbito(name, lang = 'pt') {
    if (!name || lang === 'pt') return name;
    const clean = String(name).trim();
    if (AMBITO_MAP[clean] && AMBITO_MAP[clean][lang]) {
        return AMBITO_MAP[clean][lang];
    }
    return name;
}

const LICENCA_MAP = {
    'Competição': { en: 'Competition', es: 'Competición', fr: 'Compétition' },
    'CPT / Lazer': { en: 'CPT / Leisure', es: 'CPT / Ocio', fr: 'CPT / Loisir' },
    'Todas': { en: 'All', es: 'Todas', fr: 'Toutes' }
};

export function translateLicenca(name, lang = 'pt') {
    if (!name || lang === 'pt') return name;
    const clean = String(name).trim();
    if (LICENCA_MAP[clean] && LICENCA_MAP[clean][lang]) {
        return LICENCA_MAP[clean][lang];
    }
    return name;
}

const TAG_MAP = {
    'Estrada': { en: 'Road', es: 'Carretera', fr: 'Route' },
    'Pista': { en: 'Track', es: 'Pista', fr: 'Piste' },
    'BTT': { en: 'MTB', es: 'BTT', fr: 'VTT' },
    'BTT XCO': { en: 'MTB XCO', es: 'BTT XCO', fr: 'VTT XCO' },
    'BTT XCM': { en: 'MTB XCM', es: 'BTT XCM', fr: 'VTT XCM' },
    'BTT DHI': { en: 'MTB DHI', es: 'BTT DHI', fr: 'VTT DHI' },
    'Ciclocrosse': { en: 'Cyclocross', es: 'Ciclocross', fr: 'Cyclo-cross' },
    'Gravel': { en: 'Gravel', es: 'Gravel', fr: 'Gravel' },
    'BMX': { en: 'BMX', es: 'BMX', fr: 'BMX' },
    'Enduro': { en: 'Enduro', es: 'Enduro', fr: 'Enduro' },
    'Passeio / Lazer': { en: 'Ride / Leisure', es: 'Paseo / Ocio', fr: 'Balade / Loisir' },
    'Ciclismo Para Todos': { en: 'Cycling for All', es: 'Ciclismo para Todos', fr: 'Cyclisme pour Tous' },
    'Granfondo': { en: 'Granfondo', es: 'Granfondo', fr: 'Granfondo' },
    'Mediofondo': { en: 'Mediofondo', es: 'Mediofondo', fr: 'Mediofondo' },
    'Minifondo': { en: 'Minifondo', es: 'Minifondo', fr: 'Minifondo' }
};

export function translateTag(name, lang = 'pt') {
    if (!name || lang === 'pt') return name;
    const clean = String(name).trim();
    if (TAG_MAP[clean] && TAG_MAP[clean][lang]) {
        return TAG_MAP[clean][lang];
    }
    return name;
}