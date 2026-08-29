import * as cheerio from 'cheerio';
import { prisma } from '../db.js';
import { 
    getAmbito, getTag, getRegiao, getDistrito, 
    toTitleCase, sanitizeHtml, fetchImageAsBase64 
} from './utils.js';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';

const CYCLING_KEYWORDS = [
    'btt', 'bike', 'ciclismo', 'cycling', 'gravel', 'granfondo', 
    'mediofondo', 'minifondo', 'xco', 'xcm', 'xce', 'dhi', 'dhu',
    'downhill', 'enduro', 'maratona', 'rota', 'ngps', 'iberico',
    'trofeu', 'trofeo', 'desafio', 'subida', 'circuito', 'raid', 
    'resistencia', 'volta', 'taca', 'taça', 'campeonato', 'classic', 
    'passeio', 'estrela', 'geres', 'gerês', 'xisto', 'bairrada', 
    'maia-urban', 'ceireiro', 'racenature', 'giao-bike', 'pedalar',
    'trail-btt', 'trail/btt', 'mtb'
];

const CYCLING_MODALITY_IDS = [
    { id: 2, name: 'BTT' },
    { id: 3, name: 'Ciclismo' },
    { id: 7, name: 'Trail/BTT' },
    { id: 11, name: 'Cycling' },
    { id: 17, name: 'Downhill MTB' },
    { id: 18, name: 'Gravel' }
];

const NON_CYCLING = [
    'caminhada', 'atletismo', 'triathlon', 'triatlo', 
    'obstaculos', 'ocr', 'kayak', 'sunset-trail', 'corrida', 
    'maratona-da-europa', 'meia-maratona', 'trail-run', 'trail-noturno',
    'skyrace', 'trail', 'ultra-trail', 'crosstrail', 'night-race',
    'passeio-tt', 'passeio tt', 'todo-terreno', 'todo terreno', '4x4',
    'motocross', 'karting', 'quad', 'buggy', 'motorizado', 'aquatlo', 'duatlo'
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

/**
 * Normaliza datas do Stop and Go para formato padrão e sortDate
 */
function parseStopAndGoDate(rawDateStr, fallbackYear = new Date().getFullYear().toString()) {
    if (!rawDateStr) return { dateText: 'DATA A DEFINIR', sortDate: new Date(), year: fallbackYear };
    const clean = rawDateStr.replace(/\s+/g, ' ').trim().toLowerCase();
    const yearMatch = clean.match(/202\d/);
    const year = yearMatch ? yearMatch[0] : fallbackYear;

    // Pattern 1: Multi-month range like "27 fev - 1 mar" or "27 fev a 1 mar"
    const multiMonthMatch = clean.match(/(\d{1,2})\s+([a-zçã]+)\s*(?:-|a)\s*(\d{1,2})\s+([a-zçã]+)/i);
    if (multiMonthMatch) {
        const startDay = multiMonthMatch[1].padStart(2, '0');
        const startMonthName = multiMonthMatch[2];
        const endDay = multiMonthMatch[3].padStart(2, '0');
        const endMonthName = multiMonthMatch[4];

        let startMonthNum = '01';
        for (const [mName, mCode] of Object.entries(MONTH_MAP)) {
            if (startMonthName.startsWith(mName) || mName.startsWith(startMonthName)) {
                startMonthNum = mCode;
                break;
            }
        }

        let endMonthNum = '01';
        for (const [mName, mCode] of Object.entries(MONTH_MAP)) {
            if (endMonthName.startsWith(mName) || mName.startsWith(endMonthName)) {
                endMonthNum = mCode;
                break;
            }
        }

        const startAbbr = MONTH_ABBR[startMonthNum] || 'JAN';
        const endAbbr = MONTH_ABBR[endMonthNum] || 'MAR';
        const sortDate = new Date(`${year}-${startMonthNum}-${startDay}T08:00:00Z`);
        const dateText = `${startDay} ${startAbbr} a ${endDay} ${endAbbr} ${year}`;
        return { dateText, sortDate, year };
    }

    // Single month for the rest
    let monthNum = '01';
    for (const [mName, mCode] of Object.entries(MONTH_MAP)) {
        if (clean.includes(mName)) {
            monthNum = mCode;
            break;
        }
    }
    const monthAbbr = MONTH_ABBR[monthNum] || 'JAN';

    // Pattern 2: Same-month range like "18 abr - 19 abr" or "05 - 07 set" or "5 set - 7 set"
    const rangeMatch = clean.match(/(\d{1,2})\s*(?:[a-zçã]+)?\s*(?:-|a)\s*(\d{1,2})/i);
    if (rangeMatch && !clean.match(/^\d{1,2}\s+[a-zçã]+\s+202\d$/)) {
        const startDay = rangeMatch[1].padStart(2, '0');
        const endDay = rangeMatch[2].padStart(2, '0');
        const sortDate = new Date(`${year}-${monthNum}-${startDay}T08:00:00Z`);
        const dateText = `${startDay} ${monthAbbr} a ${endDay} ${monthAbbr} ${year}`;
        return { dateText, sortDate, year };
    }

    // Pattern 3: Single day like "18 out 2026" or "7 jun 2026"
    const singleDayMatch = clean.match(/(\d{1,2})/);
    if (singleDayMatch) {
        const day = singleDayMatch[1].padStart(2, '0');
        const sortDate = new Date(`${year}-${monthNum}-${day}T08:00:00Z`);
        const dateText = `${day} ${monthAbbr} ${year}`;
        return { dateText, sortDate, year };
    }

    return { dateText: rawDateStr.toUpperCase(), sortDate: new Date(), year };
}

/**
 * Scrape detalhado de uma prova específica da Stop and Go com verificação de modalidade
 */
async function scrapeEventPage(url, retries = 2) {
    try {
        let res = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                res = await fetch(url, { 
                    headers: { 'User-Agent': 'Mozilla/5.0' }, 
                    signal: AbortSignal.timeout(6000) 
                });
                if (res.ok) break;
            } catch (err) {
                if (attempt === retries) return null;
                await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
            }
        }
        if (!res || !res.ok) return null;
        const html = await res.text();
        const $ = cheerio.load(html);

        const pageText = $('body').text().replace(/\s+/g, ' ').trim();
        const lower = pageText.toLowerCase();

        const h1 = $('h1').first().text().replace(/\s+/g, ' ').trim();
        let title = h1;
        if (title.length > 10) {
            const half = Math.floor(title.length / 2);
            const firstHalf = title.slice(0, half).trim();
            const secondHalf = title.slice(half).trim();
            if (firstHalf === secondHalf) title = firstHalf;
        }
        if (!title) return null;

        // Modalidade no cabeçalho ou badge
        let modality = '';
        $('span, div, p, a, [class*="badge"], [class*="modality"]').each((_, el) => {
            const t = $(el).text().trim().toLowerCase();
            if (['btt', 'ciclismo', 'cycling', 'gravel', 'downhill mtb', 'downhill', 'dhi', 'dhu', 'trail/btt', 'trail / btt', 'granfondo', 'triatlo', 'triathlon', 'trail', 'atletismo', 'caminhada'].includes(t)) {
                if (!modality) modality = t;
            }
        });

        // Verificar se é ciclismo
        const isDefiniteCycling = modality === 'btt' || modality === 'ciclismo' || modality === 'cycling' || 
            modality === 'gravel' || modality === 'downhill mtb' || modality === 'downhill' || modality.includes('btt') ||
            modality === 'granfondo' || lower.includes('btt') || lower.includes('ciclismo') || lower.includes('bicicleta') || 
            lower.includes('gravel') || lower.includes('downhill') || lower.includes('dhi') || lower.includes('dhu') ||
            lower.includes('granfondo') || lower.includes('mediofondo') || lower.includes('xco') || lower.includes('xcm') ||
            lower.includes('enduro') || lower.includes('ngps') || lower.includes('passeio cicloturismo') ||
            title.toLowerCase().includes('bike') || title.toLowerCase().includes('btt') || title.toLowerCase().includes('granfondo') ||
            title.toLowerCase().includes('gravel') || title.toLowerCase().includes('downhill');

        const isPureRunning = (modality === 'trail' || modality === 'atletismo' || modality === 'caminhada') &&
            !modality.includes('btt') && !lower.includes('btt') && !lower.includes('ciclismo') && !lower.includes('bike') && !lower.includes('gravel') && !lower.includes('downhill');

        if (!isDefiniteCycling || isPureRunning) {
            return null;
        }

        // Cartaz oficial
        let posterUrl = $('img[src*="storage/events"]').first().attr('src') || null;
        if (posterUrl && !posterUrl.startsWith('http')) posterUrl = 'https://stopandgo.net' + posterUrl;

        // Data precisa do cabeçalho da prova
        const slug = url.split('/').filter(Boolean).pop();
        const oldYearMatch = slug.match(/\b(201\d|202[0-3])\b/);
        if (oldYearMatch) {
            return null; // Provas históricas antigas fora do horizonte ativo
        }

        const slugYearMatch = slug.match(/202[4-9]/);
        const fallbackYear = slugYearMatch ? slugYearMatch[0] : new Date().getFullYear().toString();

        let rawDate = null;
        $('[data-icon*="calendar"]').each((_, icon) => {
            const text = $(icon).parent().text().replace(/\s+/g, ' ').trim();
            if (/\d{1,2}/.test(text) && !rawDate) {
                rawDate = text;
            }
        });

        if (!rawDate) {
            $('span.truncate').each((_, span) => {
                const text = $(span).text().replace(/\s+/g, ' ').trim();
                if (/\d{1,2}\s+[a-zçã]+\s+202\d/i.test(text) || /\d{1,2}\s+[a-zçã]+/i.test(text)) {
                    if (!rawDate) rawDate = text;
                }
            });
        }

        const parsedDate = parseStopAndGoDate(rawDate, fallbackYear);
        if (parsedDate.year < 2024) {
            return null;
        }
        const dateText = parsedDate.dateText;
        const sortDate = parsedDate.sortDate;

        // Localização
        let location = 'Portugal';
        const locMatch = pageText.match(/([A-ZÀ-Úa-zà-ú\s]+),\s*Portugal/);
        if (locMatch) location = toTitleCase(locMatch[1].trim());

        // Links de Inscrição, Regulamento e Inscritos
        const extraLinks = [{ label: 'Página Stop and Go', link: url }];
        let registrationLink = null;
        let rulesLink = null;

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
                if (!extraLinks.some(l => l.link === fullUrl)) extraLinks.push({ label: 'Lista de Inscritos', link: fullUrl });
            } else if (href.includes('/conditions')) {
                if (!extraLinks.some(l => l.link === fullUrl)) extraLinks.push({ label: 'Condições & Cancelamentos', link: fullUrl });
            }
        });

        let programaHtml = '';
        if (extraLinks.length > 0) {
            programaHtml += '<div style="margin-top: 1rem;"><p><strong>Documentos e Acessos Stop and Go:</strong></p><ul style="padding-left: 1.25rem;">';
            for (const item of extraLinks) {
                programaHtml += `<li><a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color: #0284c7; text-decoration: underline; font-weight: 500;">${sanitizeHtml(item.label)}</a></li>`;
            }
            programaHtml += '</ul></div>';
        }

        const tag = getTag(title, location + ' ' + pageText);
        const regiao = getRegiao(location);
        const distrito = getDistrito(location);
        const ambito = getAmbito(title, pageText);

        const id = 'sg_' + slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);

        return {
            id,
            title: toTitleCase(title.replace(/^(BTT|Ciclismo|Gravel|Estrada)\s+/i, '').trim()),
            date: dateText,
            sortDate,
            details: location,
            regiao,
            distrito,
            tag,
            ambito,
            licenca: 'CPT / Lazer',
            source: 'Stop and Go',
            link: registrationLink || url,
            image: posterUrl,
            logo: null,
            programa: programaHtml || null,
            extraLinks: JSON.stringify(extraLinks),
            escaloes: JSON.stringify(['Geral / Aberto']),
            prices: null
        };
    } catch (e) {
        return null;
    }
}

/**
 * Scraper Universal Stop and Go
 * Consulta o sitemap e as páginas de eventos para extrair todas as provas de ciclismo (BTT, Estrada, Gravel, Downhill, Trail/BTT)
 */
export async function scrapeStopAndGo(options = {}) {
    try {
        logInfo('SCRAPER', 'Início da sincronização Stop and Go (sitemap.xml + abas Downhill, Gravel, BTT, Estrada)');

        const res = await fetch('https://stopandgo.net/sitemap.xml', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000)
        });

        let sitemapUrls = [];
        if (res.ok) {
            const xml = await res.text();
            sitemapUrls = Array.from(new Set(xml.match(/https:\/\/stopandgo\.net\/events\/[a-zA-Z0-9_-]+/g) || []));
        }

        // Recolher URLs de sitemap e das páginas de eventos gerais e por modalidades específicas de ciclismo (Downhill, Gravel, BTT, Trail/BTT, Ciclismo, Cycling)
        const eventPageUrls = new Set(sitemapUrls);
        
        // 1. Páginas gerais
        for (let page = 1; page <= 4; page++) {
            try {
                const pRes = await fetch(`https://stopandgo.net/events?page=${page}`, { 
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(5000)
                });
                if (pRes.ok) {
                    const pHtml = await pRes.text();
                    const $p = cheerio.load(pHtml);
                    $p('a[href*="/events/"]').each((_, a) => {
                        const href = $p(a).attr('href');
                        if (href && !href.endsWith('/events') && !href.includes('?')) {
                            const full = href.startsWith('http') ? href : 'https://stopandgo.net' + href;
                            eventPageUrls.add(full);
                        }
                    });
                }
            } catch (err) {}
        }

        // 2. Abas dedicadas de modalidades de ciclismo (Downhill MTB, Gravel, Trail/BTT, BTT, Ciclismo, Cycling)
        for (const mod of CYCLING_MODALITY_IDS) {
            try {
                for (let page = 1; page <= 3; page++) {
                    const modUrl = `https://stopandgo.net/events?modality=${mod.id}&page=${page}`;
                    const mRes = await fetch(modUrl, {
                        headers: { 'User-Agent': 'Mozilla/5.0' },
                        signal: AbortSignal.timeout(5000)
                    });
                    if (mRes.ok) {
                        const mHtml = await mRes.text();
                        const $m = cheerio.load(mHtml);
                        let foundInPage = 0;
                        $m('a[href*="/events/"]').each((_, a) => {
                            const href = $m(a).attr('href');
                            if (href && !href.endsWith('/events') && !href.includes('?')) {
                                const full = href.startsWith('http') ? href : 'https://stopandgo.net' + href;
                                eventPageUrls.add(full);
                                foundInPage++;
                            }
                        });
                        if (foundInPage === 0) break; // Sem mais páginas para esta modalidade
                    }
                }
            } catch (err) {}
        }

        const allUrls = Array.from(eventPageUrls);

        // Filtrar provas potenciais de ciclismo
        const currentYear = new Date().getFullYear();
        const years = options.years || [currentYear.toString(), (currentYear + 1).toString(), (currentYear - 1).toString()];

        const targetUrls = allUrls.filter(u => {
            const lower = u.toLowerCase();
            const hasExplicitYear = years.some(yr => lower.includes(yr));
            const hasNoYearInSlug = !lower.match(/202\d/); // URLs sem ano no slug
            const matchesYear = hasExplicitYear || hasNoYearInSlug || options.fullHistorical;

            const isCycling = CYCLING_KEYWORDS.some(kw => lower.includes(kw));
            const isExcluded = NON_CYCLING.some(kw => lower.includes(kw) && !lower.includes('cycling') && !lower.includes('bike') && !lower.includes('btt') && !lower.includes('gravel') && !lower.includes('downhill'));
            return matchesYear && (isCycling || hasNoYearInSlug) && !isExcluded;
        });

        // Consultar provas Stop and Go já existentes na base de dados para retoma incremental instantânea
        const existingEvents = await prisma.event.findMany({
            where: { source: { contains: 'Stop' } },
            select: { id: true, date: true, image: true, details: true }
        });
        const existingMap = new Map(existingEvents.map(e => [e.id, e]));

        // Identificar quais os URLs que realmente precisam de download completo
        const urlsToScrape = [];
        let alreadySyncedCount = 0;

        for (const u of targetUrls) {
            const slug = u.split('/').filter(Boolean).pop() || '';
            const id = 'sg_' + slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
            const existing = existingMap.get(id);

            if (existing && existing.date && !existing.date.includes('DEFINIR') && existing.image && existing.details && !options.forceAll) {
                alreadySyncedCount++;
            } else {
                urlsToScrape.push(u);
            }
        }

        logInfo('SCRAPER', `Stop and Go: ${targetUrls.length} provas candidatas (${alreadySyncedCount} já sincronizadas, ${urlsToScrape.length} a processar/atualizar)...`);

        let savedOrMergedCount = alreadySyncedCount;
        const BATCH_SIZE = 8;
        for (let i = 0; i < urlsToScrape.length; i += BATCH_SIZE) {
            const chunk = urlsToScrape.slice(i, i + BATCH_SIZE);
            const events = await Promise.all(chunk.map(url => scrapeEventPage(url)));
            for (const ev of events) {
                if (ev) {
                    await saveOrMergeEvent(prisma, ev);
                    savedOrMergedCount++;
                }
            }
        }

        logInfo('SCRAPER', `Stop and Go: ${savedOrMergedCount} provas de ciclismo processadas e fundidas com sucesso.`);
        return savedOrMergedCount;

    } catch (e) {
        logError('SCRAPER', `Erro global no scraper Stop and Go: ${e.message}`, e);
        return 0;
    }
}
