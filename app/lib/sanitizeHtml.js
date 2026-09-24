import sanitize from 'sanitize-html';
export function safeImageSource(value) {
    if (typeof value !== 'string') return '';
    if (/^data:image\/(?:png|jpe?g|webp|gif|avif);base64,[a-zA-Z0-9+/=\s]+$/.test(value)) return value;
    if (value.startsWith('/media/') && !/["<>\\]/.test(value)) return value;
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) ? url.href : ''; } catch { return ''; }
}
export function sanitizeRichHtml(value) {
    if (typeof value !== 'string') return '';
    return sanitize(value, {
        allowedTags: [...sanitize.defaults.allowedTags, 'img'],
        allowedAttributes: { a: ['href', 'title', 'target', 'rel'], img: ['src', 'alt', 'width', 'height'], '*': ['class'] },
        allowedSchemes: ['http', 'https', 'mailto', 'tel'],
        allowedSchemesByTag: { img: ['http', 'https', 'data'] },
        exclusiveFilter: frame => frame.tag === 'img' && !safeImageSource(frame.attribs.src),
        allowProtocolRelative: false,
        transformTags: { a: sanitize.simpleTransform('a', { rel: 'noopener noreferrer' }) },
    });
}
export function sanitizeEventHtml(event) {
    if (!event) return event;
    const clean = { ...event };
    for (const key of ['image', 'logo']) if (typeof clean[key] === 'string') clean[key] = safeImageSource(clean[key]);
    for (const key of ['description', 'programa', 'prices', 'insurance', 'prizes']) {
        if (typeof clean[key] === 'string') clean[key] = sanitizeRichHtml(clean[key]);
    }
    if (Array.isArray(clean.translations)) clean.translations = clean.translations.map(sanitizeEventHtml);
    return clean;
}
