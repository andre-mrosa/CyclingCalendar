/**
 * Curated registry of cycling events with non-standard or ambiguous titles.
 * Overrides heuristics and regex matching with 100% verified accuracy.
 */
export const CURATED_DISCIPLINES = {
    // BTT / Mountain Bike
    'maia-urban-race': 'BTT',
    'algarve-bike-challenge': 'BTT',
    'giao-bike-challenge': 'BTT',
    'racenature': 'BTT',
    'race-nature': 'BTT',
    'geotour-aldeias-do-xisto': 'BTT',
    'transportugal': 'BTT',
    'iron-rider': 'BTT',
    'gps-epic': 'BTT',
    'raid-das-masseiras': 'BTT',
    'trilhos-nossa-senhora-do-ar': 'BTT',
    'resistencia-urbana-noturna': 'BTT',
    'o-vale-dos-duros': 'BTT',
    'trilhos-de-vagos': 'BTT',
    'trilhos-montanhosos-do-ave': 'BTT',
    'raid-tavira-cachopo': 'BTT',
    'bairrada-ultra-marathon': 'BTT',
    'giro-del-rei': 'BTT',
    'assalto-a-assuncao': 'BTT',
    'women-quest': 'BTT',

    // Granfondos & Mediofondos
    'granfondo-serra-da-estrela': 'Granfondo',
    'viana-granfondo': 'Granfondo',
    'douro-granfondo': 'Granfondo',
    'porto-granfondo': 'Granfondo',
    'moncao-e-melgaco-granfondo': 'Granfondo',
    'geres-granfondo': 'Granfondo',
    'eurobec-granfondo': 'Granfondo',
    'granfondo-torres-vedras': 'Granfondo',
    'granfondo-medio-tejo': 'Granfondo',
    'algarve-granfondo': 'Granfondo',
    'granfondo-aldeias-do-xisto': 'Granfondo',
    'granfondo-leiria-region': 'Granfondo',
    'coimbra-granfondo': 'Granfondo',
    'aveiro-granfondo': 'Granfondo',
    'montemuro-granfondo': 'Granfondo',
    'braganca-granfondo': 'Granfondo',
    'tavira-granfondo': 'Granfondo',

    // Gravel
    'gravel-minho': 'Gravel',
    'circuito-nacional-de-gravel': 'Gravel',
    'taca-de-portugal-de-gravel': 'Gravel',
    'gravel-da-bairrada': 'Gravel',
    'gravel-das-aldeias-do-xisto': 'Gravel',
    'alentejo-gravel': 'Gravel',

    // Estrada (Road)
    'figueira-champions-classic': 'Estrada',
    'figueira-champions-day': 'Estrada',
    'volta-ao-algarve': 'Estrada',
    'volta-a-portugal': 'Estrada',
    'volta-ao-alentejo': 'Estrada',
    'aveiro-spring-classic': 'Estrada',
    'classica-santo-thyrso': 'Estrada',
    'classica-da-primavera': 'Estrada',
    'classica-viana-do-castelo': 'Estrada',
    'classica-da-arribida': 'Estrada',
    'trofeu-internacional-da-arrabida': 'Estrada',
    'gp-o-jogo': 'Estrada',
    'gp-anicolor': 'Estrada',
    'gp-abimota': 'Estrada',
    'gp-jornal-de-noticias': 'Estrada',
    'gp-mortagua': 'Estrada',
    'gp-azores': 'Estrada',
    'gp-dos-campeoes': 'Estrada',
    'memorial-antonio-rodrigues': 'Estrada',
    'rampa-da-alegria': 'Estrada',
    'volta-ao-concelho-de-almodovar': 'Estrada',
    'volta-ao-concelho-de-cantanhede': 'Estrada',
    'volta-ao-concelho-de-loule': 'Estrada',
    'volta-vale-do-este': 'Estrada'
};

export function getCuratedDiscipline(title = '', slug = '') {
    const normalize = (s) => String(s || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');

    const normSlug = normalize(slug);
    const normTitle = normalize(title);

    if (CURATED_DISCIPLINES[normSlug]) return CURATED_DISCIPLINES[normSlug];
    if (CURATED_DISCIPLINES[normTitle]) return CURATED_DISCIPLINES[normTitle];

    for (const [key, discipline] of Object.entries(CURATED_DISCIPLINES)) {
        if (normSlug.includes(key) || normTitle.includes(key)) {
            return discipline;
        }
    }

    return null;
}
