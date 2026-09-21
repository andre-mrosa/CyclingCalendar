export const normalizeLocation = value => String(value || '').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

export function cleanLocation(value) {
    const text = String(value || '').replace(/\s+/g, ' ').replace(/^[-–—,;\s]+|[-–—,;\s]+$/g, '').trim();
    return /^(a definir|a indicar|a anunciar|por confirmar|local a definir|data a definir|nacional|portugal|todos|todas|tbd|n\/a|-)$/i.test(text) ? '' : text;
}

function safeMapUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && ['maps.app.goo.gl', 'maps.google.com', 'www.google.com', 'goo.gl'].includes(url.hostname) ? url.href : null;
    } catch { return null; }
}

// Only an explicitly named start in the programme can refine the published locality.
// Never infer the venue from the organiser, race title, finish or first GPX point.
export function resolveEventLocation(event = {}, schedule = null) {
    const district = cleanLocation(event.distrito);
    const locality = cleanLocation(event.details?.split('|')[0]);
    const starts = (schedule?.days || []).flatMap(day => day.activities || [])
        .filter(activity => /^(partida|inicio da prova|start)(\b|\s)/.test(normalizeLocation(activity.title)))
        .map(activity => ({ label: cleanLocation(activity.location), mapUrl: safeMapUrl(activity.locationUrl) }))
        .filter(activity => activity.label && !/^(local|mapa|ver mapa|aqui|google maps)$/i.test(activity.label));
    const unique = [...new Map(starts.map(start => [normalizeLocation(start.label), start])).values()];
    if (unique.length === 1) {
        return { ...unique[0], locality, district, precision: 'start', source: 'programme' };
    }
    return {
        label: locality || district, locality, district,
        precision: locality ? 'locality' : district ? 'district' : 'unknown',
        source: locality ? 'published' : district ? 'district' : null,
        mapUrl: null,
    };
}

export const getEventLocation = event => event?.locationInfo || resolveEventLocation(event || {});
export const extractEventTown = event => getEventLocation(event).locality || '';

export function formatEventLocation(event) {
    const { label, locality, district } = getEventLocation(event);
    if (!label) return '';
    let result = label;
    if (locality && normalizeLocation(label) !== normalizeLocation(locality)) {
        const parts = label.split(',').map(part => part.trim());
        const withoutLocality = parts.filter(part => normalizeLocation(part) !== normalizeLocation(locality));
        const alreadyIncluded = label.split(/[,;–()]/).some(part => normalizeLocation(part) === normalizeLocation(locality));
        if (withoutLocality.length < parts.length) {
            result = `${withoutLocality.join(', ')} (${locality})`;
        } else if (!alreadyIncluded) {
            result = `${label} (${locality})`;
        }
    }
    const parts = result.split(/[,;–()]/).map(normalizeLocation);
    if (district && !parts.includes(normalizeLocation(district))) result += `, ${district}`;
    return result;
}
