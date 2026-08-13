import * as cheerio from 'cheerio';
import { prisma } from '../db';
import { 
    formatDateStr, parseSortDate, getAmbito, getTag, getRegiao, 
    getDistrito, toTitleCase, parsePTDateToISO, sanitizeHtml 
} from './utils';

export const deepScrapeCabreira = async (link) => {
    if (!link) return { opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null };
    try {
        const response = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return { opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null };
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let opensAt = null;
        let closesAt = null;
        let description = '';
        let prices = '';
        let insurance = '';
        let prizes = '';
        let programa = null;
        
        // 2. Extract Prices
        const pricesTable = $('table').filter((i, el) => $(el).text().toLowerCase().includes('€') || $(el).text().toLowerCase().includes('eur'));
        if (pricesTable.length > 0) {
            let pricesHtml = '';
            pricesTable.each((i, el) => { pricesHtml += '<table>' + $(el).html() + '</table>\n\n'; });
            prices = sanitizeHtml(pricesHtml);
        }

        // 3. Extract Prizes, Prices, Insurance, and Programa from text linearly
        let currentSection = null;
        let pText = '';
        let iText = '';
        let insText = '';
        let progText = '';
        
        const stopHeaders = [
            'A PROVA', 'PARTICIPAÇÃO', 'CATEGORIAS DE PARTICIPAÇÃO', 'INSCRIÇÃO', 'POLÍTICA DE CANCELAMENTO', 
            'PRÉMIOS E CLASSIFICAÇÕES', 'CONDIÇÃO FÍSICA', 'SEGURANÇA', 'TERMO DE RESPONSABILIDADE:', 'TERMO DE RESPONSABILIDADE', 
            'MECÂNICA', 'SANÇÕES', 'PROGRAMA DO EVENTO', 'SECRETARIADO E LEVANTAMENTO DE FRONTAIS', 'FRONTAIS E CHIPS', 
            'ABASTECIMENTOS', 'REGULAMENTO ANTIDOPING', 'CIVISMO, RESPEITO E CONDUTA DOS PARTICIPANTES', 'CIVISMO',
            'ECORRESPONSABILIDADE', 'DIREITOS DE IMAGEM', 'RGPD', 'OUTROS', 'SEGURO DE ACIDENTES PESSOAIS', 'SEGURO DE ACIDENTES', 'SEGURO'
        ];

        $('p, li, h2, h3, h4, h5, h6, table').each((i, el) => {
            let text = '';
            const tagName = el.tagName.toLowerCase();
            
            if (tagName === 'table') {
                text = sanitizeHtml($(el).outerHTML());
                if (!text) return;
                // Treat table as part of the current section
            } else {
                text = $(el).text().trim();
                if (!text) return;
            }
            
            // Remove leading numbers like "5. " or "13. " for header matching
            let upper = tagName === 'table' ? '' : text.toUpperCase().replace(/^\d{1,2}\.\s*/, '');
            
            let isTagHeader = ['h2', 'h3', 'h4', 'h5', 'h6'].includes(tagName);
            let isKnownHeader = tagName === 'table' ? false : stopHeaders.find(h => upper === h || upper === h + 'S');
            
            // Só mudamos de secção se tivermos a certeza que é um cabeçalho
            if (isTagHeader || isKnownHeader) {
                if (upper.includes('PRÉMIO') || upper.includes('CLASSIFICAÇ')) {
                    currentSection = 'prizes';
                    return;
                } else if (upper.includes('INSCRIÇ') || upper.includes('PREÇOS')) {
                    currentSection = 'prices';
                    return;
                } else if (upper.includes('SEGURO')) {
                    currentSection = 'insurance';
                    return;
                } else if (upper.includes('PROGRAMA')) {
                    currentSection = 'programa';
                    return;
                } else {
                    currentSection = null; // É um cabeçalho de outra secção (ex: Segurança), portanto paramos de gravar
                }
            }
            
            if (currentSection === 'prizes') pText += text + '\n\n';
            else if (currentSection === 'prices') iText += text + '\n\n';
            else if (currentSection === 'insurance') insText += text + '\n\n';
            else if (currentSection === 'programa') progText += text + '<br/><br/>';
        });
        
        if (pText.length > 20) prizes = pText; 
        if (iText.length > 20 && !prices) prices = iText;
        if (insText.length > 20 && !insurance) insurance = insText;
        if (!programa && progText.length > 20) programa = sanitizeHtml(progText);

        // For description, get the first non-empty paragraph
        $('p').each((i, el) => {
            const txt = $(el).text().trim();
            if (txt.length > 50 && !description && !txt.toUpperCase().includes('INSCRIÇÃO') && !txt.toUpperCase().includes('REGULAMENTO')) {
                description = txt;
            }
        });

        // Parse phase dates
        $('li, p').each((_, el) => {
            const text = $(el).text();
            if (text.includes('Fase de inscrição') && text.includes('abertura') && text.includes('encerramento')) {
                const abertMatch = text.match(/abertura dia (\d{2}-\d{2}-\d{4}(?: pelas \d{2}h\d{2})?)/);
                const encerMatch = text.match(/do dia (\d{2}-\d{2}-\d{4})/);
                
                if (abertMatch && !opensAt) opensAt = parsePTDateToISO(abertMatch[1]);
                if (encerMatch) closesAt = parsePTDateToISO(encerMatch[1] + " pelas 23h59");
            }
        });
        
        return { opensAt, closesAt, description, prices, insurance, prizes, programa };
    } catch(e) {
        return { opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null };
    }
}

export const scrapeCabreira = async (year) => {
    const response = await fetch(`https://cabreirasolutions.com/eventos/`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) return;

    const html = await response.text();
    const $ = cheerio.load(html);
    const items = $('.evento-grid-item').toArray();
    
    for (const element of items) {
        const aTag = $(element).find('.evento-item-image-container a');
        let href = aTag.attr('href') || '';
        
        let title = 'Evento Cabreira';
        if (href) {
            const parts = href.split('/').filter(Boolean);
            const slug = parts[parts.length - 1];
            if (slug) {
                title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
            }
        }

        let dateText = $(element).find('.evento-item-data').text().trim().toUpperCase() || 'DATA A DEFINIR';
        const rawDateForSort = dateText;
        dateText = formatDateStr(dateText, year);
        
        let locText = $(element).find('.evento-item-local').text().trim() || 'A DEFINIR';
        if (locText !== 'A DEFINIR') locText = toTitleCase(locText);
        
        if (year && dateText.includes(year)) {
            const ambitoVal = getAmbito(title);
            const id = 'cabreira-' + title.replace(/\s+/g, '-').toLowerCase() + '-' + year;
            
            // Deep Scrape
            const deepData = await deepScrapeCabreira(href);
            
            const eventData = {
                title: title,
                date: dateText,
                sortDate: new Date(parseSortDate(rawDateForSort, year)),
                details: locText,
                tag: getTag(title),
                ambito: ambitoVal,
                escaloes: JSON.stringify(['Todos (Aberto)']),
                licenca: 'CPT / Lazer',
                regiao: getRegiao(title, locText),
                distrito: getDistrito(title, locText),
                source: 'Cabreira',
                link: href || 'https://cabreirasolutions.com/eventos/',
                extraLinks: JSON.stringify(href ? [{ label: 'Ver na Cabreira Solutions', link: href }] : []),
                registrationOpensAt: deepData.opensAt,
                registrationClosesAt: deepData.closesAt,
                description: deepData.description,
                prices: deepData.prices,
                insurance: deepData.insurance,
                prizes: deepData.prizes,
                programa: deepData.programa,
            };

            await prisma.event.upsert({
                where: { id: id },
                update: eventData,
                create: { id: id, ...eventData }
            });
        }
    }
}
