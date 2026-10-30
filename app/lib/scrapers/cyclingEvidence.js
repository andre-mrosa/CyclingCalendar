const normalized = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

// Positive cycling evidence takes precedence for mixed cycling/walking events.
// An explicit cycling category also admits neutral names such as "Desafio da Serra".
export function isCyclingCandidate(title, cyclingContext = false) {
    const text = normalized(title);
    if (/\b(btt|mtb|bike|ciclismo|cicloturismo|cicloturistas?|bicicletas?|gravel|gran\s*fondo|grandfondo|mediofondo|minifondo|xco|xcm|xcc|xce|xcr|downhill|enduro|bmx|ciclocross[ea]?)\b/.test(text)) return true;
    if (/\b(trail|running|run|corrida|caminhada|silvestre|atletismo|skyrunning|triatlo|triathlon|natacao)\b/.test(text)) return false;
    return cyclingContext;
}

// Read only an explicit sport label or the definition of the event. Generic
// mentions of roads/traffic rules elsewhere in regulations are not evidence.
export function publishedRegulationDiscipline(text) {
    const value = normalized(text).replace(/\s+/g, ' ');
    const sport = '(btt|mtb|gravel|estrada|bmx|ciclocrosse?|cicloturismo)\\b';
    const match = value.match(new RegExp('\\bmodalidade\\s*[:–-]?\\s*' + sport)) ||
        value.match(new RegExp('\\be\\s+(?:uma?|um)\\s+(?:prova|evento|competicao)\\b[^.!?]{0,100}?\\b(?:em|de)\\s+' + sport));
    if (!match) return '';
    return {btt:'BTT',mtb:'BTT',gravel:'Gravel',estrada:'Estrada',bmx:'BMX',ciclocross:'Ciclocrosse',ciclocrosse:'Ciclocrosse',cicloturismo:'Passeio / Lazer'}[match[1]] || '';
}
