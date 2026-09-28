import * as cheerio from 'cheerio';

// Split legacy FPC HTML without discarding descriptions nested inside programa.
// Called on the server after sanitisation, for both API and standalone pages.
export function withEventDisplayContent(event) {
    if (!event?.programa || !event.source?.includes('FPC')) return event;
    const $ = cheerio.load(event.programa, null, false);
    const descriptions = $('.fpc-description').map((_, el) => {
        // Legacy imports included the whole FPC page. Prefer its race content.
        const fragment = cheerio.load($(el).html() || '', null, false);
        fragment('nav, header, footer, form, #navigation, .navbar, .menu, .menu_lateral_items, .redes_sociais, .footer, .copyright').remove();
        const main = fragment('.main__middle__container, .main-content').first();
        return main.length ? main.html() : fragment.html();
    }).get().filter(Boolean);
    $('.fpc-description, .fpc-downloads, .fpc-buttons').remove();
    const existingText = cheerio.load(event.description || '').text().replace(/\s+/g, ' ').trim();
    const extra = descriptions.filter(html => { const text = cheerio.load(html).text().replace(/\s+/g, ' ').trim(); return text && !existingText.includes(text); });
    return { ...event, description: [event.description, ...extra].filter(Boolean).join('\n'), programContent: $.html().trim() };
}
