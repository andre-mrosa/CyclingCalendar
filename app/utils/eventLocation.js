/**
 * Utilitário centralizado para formatar a localização exata de provas de ciclismo.
 * Garante que a Localidade / Concelho (ex: Lousã, Azabuxo, Paredes) seja sempre
 * apresentada em destaque, acompanhada do respetivo Distrito (ex: Lousã, Coimbra).
 */

export function extractEventTown(event) {
    if (!event) return '';

    const title = (event.title || '').trim();
    const details = (event.details || '').trim();
    const organizador = (event.organizador || '').trim();
    const link = (event.link || '').trim();

    // 1. Casos específicos conhecidos por nome de clube / freguesia
    if (/arlu/i.test(title) || /azabuxo/i.test(organizador) || /azabuxo/i.test(link)) {
        return 'Azabuxo';
    }

    // 2. Extrair a primeira parte de details (antes do pipe '|')
    let rawLoc = details ? details.split('|')[0].trim() : '';

    if (rawLoc && !/^a definir$/i.test(rawLoc) && rawLoc !== 'DATA A DEFINIR') {
        // Limpar pontuação residual no início ou fim
        rawLoc = rawLoc.replace(/^[-–—,;\s]+/, '').replace(/[-–—,;\s]+$/, '').trim();
        if (rawLoc) return rawLoc;
    }

    // 3. Fallback: procurar no título da prova por concelhos ou localidades óbvias
    if (/lousã|lousa/i.test(title)) return 'Lousã';
    if (/paredes de coura/i.test(title)) return 'Paredes de Coura';
    if (/\bparedes\b/i.test(title) && !/coura/i.test(title)) return 'Paredes';

    return event.distrito || '';
}

/**
 * Retorna a localização amigável completa para apresentação ao utilizador:
 * - "Lousã, Coimbra"
 * - "Azabuxo, Leiria"
 * - "Paredes, Porto"
 * - "Leiria" (quando a localidade já é a capital de distrito)
 */
export function formatEventLocation(event) {
    if (!event) return 'Portugal';

    const town = extractEventTown(event);
    const distrito = (event.distrito || '').trim();

    if (!town && !distrito) return 'Portugal';
    if (town && !distrito) return town;
    if (!town && distrito) return distrito;

    // Normalização para evitar repetições redundantes (ex: "Leiria, Leiria" -> "Leiria")
    const cleanTown = town.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
    const cleanDistrito = distrito.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

    if (cleanTown === cleanDistrito || cleanTown.includes(cleanDistrito)) {
        return town;
    }

    return `${town}, ${distrito}`;
}
