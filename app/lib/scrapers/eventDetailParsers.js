import * as cheerio from 'cheerio';
import { sanitizeRichHtml } from '../sanitizeHtml.js';

const cleanText = value => String(value || '').replace(/\s+/g, ' ').trim();
export function publicLink(value, base) {
    if (typeof value !== 'string' || !value.trim()) return null;
    try { const url = new URL(value, base); return /^https?:$/.test(url.protocol) && !url.username && !url.password && !/\s/.test(url.hostname) ? url.href : null; } catch { return null; }
}
function cleanBlock($, element, base) {
    const block = $(element).clone();
    block.find('script,style,form,input,select,button,svg,iframe,nav,header,footer').remove();
    block.find('*').removeAttr('class').removeAttr('style');
    block.find('a').each((_, el) => { const href = publicLink($(el).attr('href'), base); if (href) $(el).attr('href', href); else $(el).removeAttr('href'); });
    block.find('img').each((_, el) => { const src = publicLink($(el).attr('src'), base); if (src) $(el).attr('src', src); else $(el).remove(); });
    return sanitizeRichHtml(block.html() || '');
}
function resources($, selector, base) {
    const links = [];
    $(selector).each((_, el) => {
        const label = cleanText($(el).text());
        const link = publicLink($(el).attr('href'), base);
        if (link && /regulamento|programa|percurso|track|cartaz|inscrever|\.pdf(?:\?|$)|\.gpx(?:\?|$)|\.kml(?:\?|$)/i.test(label + ' ' + link) && !links.some(l => l.link === link)) links.push({ label: label || 'Documento da prova', link });
    });
    return links;
}

export function parseApedalarDetails(html, url) {
    const $ = cheerio.load(html);
    const title = cleanText($('h1').first().text());
    if (!title || !$('h2').filter((_, el) => cleanText($(el).text()) === 'QUANDO?').length) throw new Error('Página Apedalar sem ficha de prova');
    const heading = text => $('h2').filter((_, el) => cleanText($(el).text()) === text).first();
    const when = heading('QUANDO?').parent();
    const where = heading('ONDE?').parent();
    const contacts = heading('CONTACTOS DA ORGANIZAÇÃO').parent();
    const priceHeading = heading('QUANTO?');
    const priceBlock = priceHeading.parent().next();
    const prices = priceBlock.length && /€/.test(priceBlock.text()) ? cleanBlock($, priceBlock, url) : null;
    const blocks = [when, where, contacts].filter(block => block.length).map(block => cleanBlock($, block, url));
    // Only named editorial sections: never import participant tables or payment forms.
    const editorial = $('[class~=prose], .event-description, .descricao-evento');
    editorial.each((_, el) => { if (!$(el).closest('#inscricoes-section,form').length) blocks.push(cleanBlock($, el, url)); });
    const extraLinks = resources($, 'h1:first-of-type ~ div a, a[download], a[href*="/download/"]', url);
    const poster = $('img[src*="/media/"]').first().attr('src');
    return { title, description: blocks.filter(Boolean).join('\n'), prices,
        organizador: cleanText(contacts.find('.whitespace-pre-line').text()) || null,
        image: poster ? publicLink(poster, url) : null,
        extraLinks: [{ label: 'Página Apedalar', link: url }, ...extraLinks] };
}

export function parseRecordePessoalDetails(html, url) {
    const $ = cheerio.load(html);
    const title = cleanText($('.eventoTitulo .titulosPaginasBold').text());
    if (!title || !$('.eventoLeft').length) throw new Error('Página Recorde Pessoal sem ficha de prova');
    const description = cleanBlock($, $('.eventoLeft .paginaEvento'), url);
    const schedule = cleanBlock($, $('.dataEvento'), url);
    const poster = $('.cartazEvento').attr('href');
    return { title, description: description || null, programa: schedule || null,
        image: poster ? publicLink(poster, url) : null,
        extraLinks: [{ label: 'Página Recorde Pessoal', link: url }, ...resources($, '.eventoRight a, .paginaEvento a', url)] };
}
