import * as cheerio from 'cheerio';
import { prisma } from '../db.js';
import {
    getAmbito, getTag, getRegiao, getDistrito,
    toTitleCase, sanitizeHtml, fetchImageAsBase64
} from './utils.js';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';

const CYCLING_CATEGORIES = [
    'btt', 'ciclismo', 'gravel', 'granfondo', 'mediofondo',
    'xco', 'xcm', 'xce', 'dhi', 'downhill', 'enduro',
    'bike', 'estrada', 'cycling', 'e-bike', 'ebike'
];

const MONTH_MAP = {
    'janeiro': '01', 'jan': '01',
    'fevereiro': '02', 'fev': '02',
    'março': '03', 'marco': '03', 'mar': '03',
    'abril': '04', 'abr': '04',
    'maio': '05', 'mai': '05',
    'junho': '06', 'jun': '06',
    'julho': '07', 'jul': '07',
    'agosto': '08', 'ago': '08',
    'setembro': '09', 'set': '09',
    'outubro': '10', 'out': '10',
    'novembro': '11', 'nov': '11',
    'dezembro': '12', 'dez': '12'
};

const MONTH_ABBR = {
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR',
    '05': 'MAI', '06': 'JUN', '07': 'JUL', '08': 'AGO',
    '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ'
};

function parseStopAndGoDate(rawDateStr) {
    if (!rawDateStr) return { dateText: 'DATA A DEFINIR', sortDate: new Date(), year: new Date().getFullYear().toString() };
    const clean = rawDateStr.replace(/\s+/g, ' ').trim().toLowerCase();
    const yearMatch = clean.match(/202\d/);
    const year = yearMatch ? yearMatch[0] : new Date().getFullYear().toString();

    let monthNum = '01';
    for (const [mName, mCode] of Object.entries(MONTH_MAP)) {
        if (clean.includes(mName)) {
            monthNum = mCode;
            break;
        }
    }
    const monthAbbr = MONTH_ABBR[monthNum] || 'JAN';

    const rangeMatch = clean.match(/(\d{1,2})\s*-\s*(\d{1,2})/);
    if (rangeMatch) {
        const startDay = rangeMatch[1].padStart(2, '0');
        const endDay = rangeMatch[2].padStart(2, '0');
        const sortDate = new Date(year + '-' + monthNum + '-' + startDay + 'T08:00:00Z');
        const dateText = startDay + ' ' + monthAbbr + ' a ' + endDay + ' ' + monthAbbr + ' ' + year;
        return { dateText, sortDate, year };
    }

    const singleDayMatch = clean.match(/(\d{1,2})/);
    if (singleDayMatch) {
        const day = singleDayMatch[1].padStart(2, '0');
        const sortDate = new Date(year + '-' + monthNum + '-' + day + 'T08:00:00Z');
        const dateText = day + ' ' + monthAbbr + ' ' + year;
        return { dateText, sortDate, year };
    }

    return { dateText: rawDateStr.toUpperCase(), sortDate: new Date(), year };
}

export async function deepScrapeStopAndGoEvent(eventUrl) {
    const defaultData = { registrationLink: null, rulesLink: null, participantsLink: null, programaHtml: null, extraLinks: [] };
    if (!eventUrl) return defaultData;
    try {
        const res = await fetch(eventUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(4000) });
        if (!res.ok) return defaultData;
        const html = await res.text();
        const $ = cheerio.load(html);
        const extraLinks = [];
        let registrationLink = null;
        let rulesLink = null;
        let participantsLink = null;

        $('a').each((_, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (!href || href === '#' || href.startsWith('javascript:')) return;
            const fullUrl = href.startsWith('http') ? href : 'https://stopandgo.net' + href;

            if (href.includes('/registrations/create') || text.toLowerCase() === 'inscrição' || text.toLowerCase() === 'inscrever') {
                registrationLink = fullUrl;
                if (!extraLinks.some(l => l.link === fullUrl)) extraLinks.push({ label: 'Inscrição (Stop and Go)', link: fullUrl });
            } else if (href.includes('/rules') || text.toLowerCase().includes('regulamento')) {
                rulesLink = fullUrl;
                if (!extraLinks.some(l => l.link === fullUrl)) extraLinks.push({ label: 'Regulamento Oficial', link: fullUrl });
            } else if (href.includes('/registrations') && !href.includes('/create')) {
                participantsLink = fullUrl;
                if (!extraLinks.some(l => l.link === fullUrl)) extraLinks.push({ label: 'Lista de Inscritos', link: fullUrl });
            } else if (href.includes('/conditions')) {
                if (!extraLinks.some(l => l.link === fullUrl)) extraLinks.push({ label: 'Condições & Cancelamentos', link: fullUrl });
            }
        });

        let programaHtml = '';
        if (extraLinks.length > 0) {
            programaHtml += '<div style="margin-top: 1rem;"><p><strong>Documentos e Acessos Stop and Go:</strong></p><ul style="padding-left: 1.25rem;">';
            for (const item of extraLinks) {
                programaHtml += '<li><a href="' + item.link + '" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline; font-weight: 500;">' + sanitizeHtml(item.label) + '</a></li>';
            }
            programaHtml += '</ul></div>';
        }

        return { registrationLink, rulesLink, participantsLink, programaHtml: programaHtml || null, extraLinks };
    } catch (e) {
        return defaultData;
    }
}

export async function scrapeStopAndGo(options = {}) {
    try {
        logInfo('SCRAPER', 'Início da sincronização Stop and Go (https://stopandgo.net/events)');
        const response = await fetch('https://stopandgo.net/events', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000)
        });

        if (!response.ok) {
            logError('SCRAPER', 'Falha ao aceder à Stop and Go (HTTP ' + response.status + ')');
            return 0;
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        const cards = [];
        $('a[data-ga4-params]').each((_, el) => {
            const raw = $(el).attr('data-ga4-params');
            const href = $(el).attr('href');
            if (!href || href.endsWith('/events')) return;

            try {
                const parsed = JSON.parse(raw);
                const item = parsed.items?.[0];
                if (item) {
                    const fullUrl = href.startsWith('http') ? href : 'https://stopandgo.net' + href;
                    if (!cards.some(c => c.url === fullUrl)) {
                        cards.push({
                            url: fullUrl,
                            itemId: item.item_id || null,
                            itemName: item.item_name || '',
                            itemCategory: item.item_category || '',
                            itemCategory2: item.item_category2 || '',
                            el: $(el)
                        });
                    }
                }
            } catch (err) {}
        });

        logInfo('SCRAPER', 'Stop and Go: ' + cards.length + ' eventos totais encontrados na página. A filtrar ciclismo/BTT...');
        let savedOrMergedCount = 0;

        for (const card of cards) {
            try {
                const cat = (card.itemCategory + ' ' + card.itemName).toLowerCase();
                const isCycling = CYCLING_CATEGORIES.some(c => cat.includes(c));
                if (!isCycling) continue; // Ignora Atletismo, Trail, OCR, etc.

                let title = card.itemName || 'Evento Stop and Go';
                title = title.replace(/^(BTT|Ciclismo|Gravel|Estrada)\s+/i, '').trim();

                // Extrair imagem do cartaz
                const posterImg = card.el.find('img[src*="storage/events"]').first();
                let posterUrl = posterImg.attr('src') || null;
                if (posterUrl && !posterUrl.startsWith('http')) {
                    posterUrl = 'https://stopandgo.net' + posterUrl;
                }

                let posterBase64 = null;
                if (posterUrl) {
                    posterBase64 = await fetchImageAsBase64(posterUrl);
                }

                const cardText = card.el.text().replace(/\s+/g, ' ').trim();
                const dateMatches = cardText.match(/\d{1,2}(?:\s*-\s*\d{1,2})?\s+de\s+[a-zçã]+\s+202\d/i);
                const rawDate = dateMatches ? dateMatches[0] : cardText;
                const { dateText, sortDate, year } = parseStopAndGoDate(rawDate);

                let location = card.itemCategory2 || 'Portugal';
                const locMatch = cardText.match(/([A-ZÀ-Úa-zà-ú\s]+),\s*Portugal/);
                if (locMatch) location = toTitleCase(locMatch[1].trim());

                const tag = cat.includes('btt') ? 'BTT' : cat.includes('gravel') ? 'Gravel' : 'Ciclismo';
                const ambito = getAmbito(title, cardText);
                const regiao = getRegiao(location);
                const distrito = getDistrito(location);

                // Deep scraping para links específicos
                const deepData = await deepScrapeStopAndGoEvent(card.url);
                const extraLinks = [{ label: 'Página Stop and Go', link: card.url }, ...(deepData.extraLinks || [])];
                const uniqueLinks = [];
                const seenUrls = new Set();
                for (const l of extraLinks) {
                    if (l.link && !seenUrls.has(l.link)) {
                        seenUrls.add(l.link);
                        uniqueLinks.push(l);
                    }
                }

                const id = 'sg_' + (card.itemId || Buffer.from(card.url).toString('base64').replace(/[^a-zA-Z0-9]/g, '').slice(0, 24));

                const eventData = {
                    id,
                    title: toTitleCase(title),
                    date: dateText,
                    sortDate,
                    details: location,
                    regiao,
                    distrito,
                    tag,
                    ambito,
                    licenca: 'CPT / Lazer',
                    source: 'Stop and Go',
                    link: deepData.registrationLink || card.url,
                    image: posterBase64 || posterUrl,
                    logo: null,
                    programa: deepData.programaHtml,
                    extraLinks: JSON.stringify(uniqueLinks),
                    escaloes: JSON.stringify(['Geral / Aberto']),
                    prices: null
                };

                await saveOrMergeEvent(prisma, eventData);
                savedOrMergedCount++;
            } catch (errCard) {
                console.error('Erro ao processar card Stop and Go:', card.url, errCard);
            }
        }

        logInfo('SCRAPER', 'Stop and Go: ' + savedOrMergedCount + ' provas de ciclismo processadas e fundidas com sucesso.');
        return savedOrMergedCount;
    } catch (e) {
        logError('SCRAPER', 'Erro global no scraper Stop and Go: ' + e.message, e);
        return 0;
    }
}
