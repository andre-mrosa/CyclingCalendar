// Only downloadable files; never infer a route or stage from its position.
export function getEventDocuments(event) {
    if (!event) return [];
    let extra = event.extraLinks || [];
    if (typeof extra === 'string') { try { extra = JSON.parse(extra); } catch { extra = []; } }
    const candidates = Array.isArray(extra) ? [...extra] : [];
    const html = `${event.programa || ''} ${event.description || ''}`;
    for (const match of html.matchAll(/href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
        candidates.push({ link: match[1].replaceAll('&amp;', '&'), label: match[2].replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim() });
    }
    const documents = new Map();
    for (const item of candidates) {
        if (!item || typeof item.link !== 'string') continue;
        const link = item.link.trim();
        if (!/^https?:\/\//i.test(link) && !link.startsWith('/media/')) continue;
        const format = link.match(/\.(pdf|gpx|kml|tcx|fit|zip)(?:$|[?#])/i)?.[1]?.toUpperCase();
        if (!format || documents.has(link)) continue;
        let label = item.label || '';
        const key = link.toLowerCase();
        if (!label || /link adicional|documento pdf|download|^link$/i.test(label)) {
            if (/guia_tecnico/.test(key)) label = 'Guia técnico';
            else if (/regulamento/.test(key)) label = 'Regulamento';
            else if (['GPX', 'KML', 'TCX', 'FIT'].includes(format)) label = 'Percurso GPS';
            else if (/percurso/.test(key)) label = 'Percurso';
            else label = 'Documento';
        }
        documents.set(link, { link, label, format });
    }
    const counts = new Map();
    return [...documents.values()].map(doc => {
        const key = `${doc.label} (${doc.format})`;
        const count = (counts.get(key) || 0) + 1;
        counts.set(key, count);
        return { ...doc, label: key + (count > 1 ? ` · ${count}` : '') };
    });
}
