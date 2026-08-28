/**
 * Utilitários de normalização e comparação de eventos desportivos entre fontes (FPC, Cabreira, StopAndGo, etc.)
 */

export function normalizeText(text) {
    if (!text) return '';
    return text
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/\b(20\d\d)\b/g, '') // remove anos (2024, 2025, 2026, 2027)
        .replace(/\b(\d+)[ºª\.]?\b/g, '') // remove edições (1º, 2ª, 10.)
        .replace(/\b(i|ii|iii|iv|v|vi|vii|viii|ix|x|xi|xii)\b/g, '') // numeração romana
        .replace(/\b(edicao|trofeu|taca|campeonato|prova|grande|premio|circuito|passeio|maratona|meia|mini|open)\b/g, '') // palavras genéricas
        .replace(/\b(de|do|da|dos|das|em|na|no|o|a|os|as|e)\b/g, '') // stop words
        .replace(/[^a-z0-9]/g, ' ') // caracteres especiais
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Calcula o coeficiente de similaridade de Dice / Jaccard baseado em tokens (palavras-chave)
 */
export function calculateTokenSimilarity(str1, str2) {
    const norm1 = normalizeText(str1);
    const norm2 = normalizeText(str2);

    if (!norm1 || !norm2) return 0;
    if (norm1 === norm2) return 1;

    const tokens1 = new Set(norm1.split(' ').filter(t => t.length > 2));
    const tokens2 = new Set(norm2.split(' ').filter(t => t.length > 2));

    if (tokens1.size === 0 || tokens2.size === 0) return 0;

    let intersectionCount = 0;
    for (const t of tokens1) {
        if (tokens2.has(t)) {
            intersectionCount++;
        } else {
            // Verificar sub-palavras ou radicais (ex: "geres" e "geres")
            for (const t2 of tokens2) {
                if (t.includes(t2) || t2.includes(t)) {
                    intersectionCount += 0.8;
                    break;
                }
            }
        }
    }

    const similarity = (2 * intersectionCount) / (tokens1.size + tokens2.size);
    return Math.min(1, similarity);
}

/**
 * Verifica se dois eventos representam a mesma prova no mundo real
 */
export function isSameEvent(existingEvent, candidateEvent) {
    if (!existingEvent || !candidateEvent) return false;

    // 1. Verificação de ID direto
    if (existingEvent.id === candidateEvent.id) return true;

    // 2. Verificação de Datas
    const existingDate = existingEvent.sortDate ? new Date(existingEvent.sortDate) : null;
    const candidateDate = candidateEvent.sortDate ? new Date(candidateEvent.sortDate) : null;

    if (existingDate && candidateDate) {
        // Diferença absoluta em horas
        const diffHours = Math.abs(existingDate.getTime() - candidateDate.getTime()) / (1000 * 60 * 60);

        // Se a diferença for superior a 72 horas (3 dias), consideramos eventos distintos
        if (diffHours > 72) {
            return false;
        }

        // Se for no mesmo fim de semana ou dia idêntico
        const simScore = calculateTokenSimilarity(existingEvent.title, candidateEvent.title);

        // Casos de alta similaridade no mesmo fim de semana (>= 0.60)
        if (simScore >= 0.60) {
            return true;
        }

        // Se o título contiver as palavras-chave principais do outro (ex: "Granfondo do Gerês" e "Gerês Granfondo")
        const norm1 = normalizeText(existingEvent.title);
        const norm2 = normalizeText(candidateEvent.title);
        if (norm1 && norm2 && (norm1.includes(norm2) || norm2.includes(norm1))) {
            return true;
        }

        // Verificação por Localidade + Similaridade Moderada (>= 0.45)
        const loc1 = normalizeText(existingEvent.details || existingEvent.distrito || '');
        const loc2 = normalizeText(candidateEvent.details || candidateEvent.distrito || '');
        if (loc1 && loc2 && (loc1.includes(loc2) || loc2.includes(loc1)) && simScore >= 0.45) {
            return true;
        }
    }

    return false;
}
