import * as cheerio from 'cheerio';
import { prisma } from '../db.js';
import { 
    getAmbito, getTag, getRegiao, getDistrito, 
    toTitleCase, sanitizeHtml
} from './utils.js';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { readStopAndGoHeader, stopAndGoEventUrl } from './stopandgoParser.js';

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
    'maratona-da-europa', 'meia-maratona', 'meia maratona', 'trail-run', 'trail-noturno',
    'skyrace', 'skyrunning', 'sky-running', 'sky-race',
    'trail', 'ultra-trail', 'ultra trail', 'crosstrail', 'cross-trail', 'night-race',
    'vertical-race', 'vertical race', 'vertical-km', 'vertical km',
    'trilhos', 'corta-mato', 'corta mato', 'cross-country-run',
    'fun-race', 'fun race', 'up-run',
    'passeio-tt', 'passeio tt', 'todo-terreno', 'todo terreno', '4x4',
    'motocross', 'karting', 'quad', 'buggy', 'motorizado', 'aquatlo', 'duatlo',
    'running', 'mm-dao', 'mm-dão', 'mmaratona', 'edp-meia', 'edp-mm',
    'night-urban-trail', 'arada-vertical', 'lamecum-trail', 'lamecum-vertical',
    'louzanskyrace', 'marão-sky', 'marao-sky', 'abutres', 'ultra-skyrunning',
    'inter-escolas', 'concelhio'
];

function checkRateLimit(response) {
    if (response.status === 429) throw Object.assign(new Error('Stop and Go limitou os pedidos (HTTP 429); retomar na próxima sincronização'), { rateLimited: true });
}

/**
 * Scrape detalhado de uma prova específica da Stop and Go com verificação de modalidade
 */
export async function scrapeEventPage(url, retries = 2, options = {}) {
    try {
        let res = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                res = await fetch(url, { 
                    headers: { 'User-Agent': 'Mozilla/5.0' }, 
                    signal: AbortSignal.timeout(6000) 
                });
                if (res.ok) break;
                // Stop the source on rate limiting instead of discarding pages
                // and reporting a successful synchronization with missing events.
                checkRateLimit(res);
            } catch (err) {
                if (err.rateLimited) throw err;
                if (attempt === retries) {
                    await logError('SCRAPER', `Stop and Go: falha ao consultar ${url}: ${err.message}`, err);
                    return null;
                }
                await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
            }
        }
        if (!res || !res.ok) {
            await logError('SCRAPER', `Stop and Go: falha ao consultar ${url} (HTTP ${res?.status || 'indisponível'})`);
            return null;
        }
        const html = await res.text();
        return parseStopAndGoEvent(html, url, options);
    } catch (error) {
        if (error.rateLimited) throw error;
        await logError('SCRAPER', `Stop and Go: erro ao ler ${url}: ${error.message}`, error);
        return null;
    }
}

export function parseStopAndGoEvent(html, url, options = {}) {
    try {
        url = stopAndGoEventUrl(url);
        if (!url) return null;
        const $ = cheerio.load(html);
        const header = readStopAndGoHeader(html);
        let title = header.title;
        if (title.length > 10) {
            const half = Math.floor(title.length / 2);
            const firstHalf = title.slice(0, half).trim();
            const secondHalf = title.slice(half).trim();
            if (firstHalf === secondHalf) title = firstHalf;
        }
        if (!title || !header.cycling || !header.sortDate) return null;
        const currentYear = new Date().getFullYear();
        const years = (options.years || [currentYear - 1, currentYear, currentYear + 1]).map(String);
        if (!years.includes(header.year)) return null;

        // Cartaz oficial
        let posterUrl = $('h1').first().parent().find('img[src*="storage/events"]').first().attr('src') || null;
        if (posterUrl && !posterUrl.startsWith('http')) posterUrl = 'https://stopandgo.net' + posterUrl;

        // Data precisa do cabeçalho da prova
        const slug = url.split('/').filter(Boolean).pop();
        const dateText = header.date;
        const sortDate = header.sortDate;

        // Localização
        const location = toTitleCase(header.location.replace(/,\s*Portugal$/i, '').trim() || 'Portugal');

        // Links de Inscrição, Regulamento e Inscritos
        const extraLinks = [{ label: 'Página Stop and Go', link: url }];
        let registrationLink = null;

        $('a').each((_, el) => {
            const href = $(el).attr('href') || '';
            const text = $(el).text().replace(/\s+/g, ' ').trim();
            if (!href || href === '#' || href.startsWith('javascript:')) return;
            const fullUrl = href.startsWith('http') ? href : 'https://stopandgo.net' + href;
            if (stopAndGoEventUrl(fullUrl) !== url) return;

            if (href.includes('/registrations/create') || text.toLowerCase() === 'inscrição' || text.toLowerCase() === 'inscrever') {
                registrationLink = fullUrl;
                if (!extraLinks.some(l => l.link === fullUrl)) extraLinks.push({ label: 'Inscrição (Stop and Go)', link: fullUrl });
            } else if (href.includes('/rules') || text.toLowerCase().includes('regulamento')) {
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

        const tag = getTag(title, header.modality);
        const regiao = getRegiao(location);
        const distrito = getDistrito(location);
        const ambito = getAmbito(title, header.modality);

        const id = 'sg_' + slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);

        return {
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
        checkRateLimit(res);

        let sitemapUrls = [];
        if (res.ok) {
            const xml = await res.text();
            sitemapUrls = Array.from(new Set(xml.match(/https:\/\/stopandgo\.net\/events\/[a-zA-Z0-9_-]+/g) || []));
        } else {
            await logError('SCRAPER', `Stop and Go: sitemap indisponível (HTTP ${res.status})`);
        }

        // Recolher URLs de sitemap e das páginas de eventos gerais e por modalidades específicas de ciclismo (Downhill, Gravel, BTT, Trail/BTT, Ciclismo, Cycling)
        const eventPageUrls = new Set(sitemapUrls);
        const cyclingListingUrls = new Set();
        
        // 1. Páginas gerais
        for (let page = 1; page <= 4; page++) {
            try {
                const pRes = await fetch(`https://stopandgo.net/events?page=${page}`, { 
                    headers: { 'User-Agent': 'Mozilla/5.0' },
                    signal: AbortSignal.timeout(5000)
                });
                checkRateLimit(pRes);
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
                if (!pRes.ok) await logError('SCRAPER', `Stop and Go: página ${page} indisponível (HTTP ${pRes.status})`);
            } catch (err) {
                if (err.rateLimited) throw err;
                await logError('SCRAPER', `Stop and Go: falha na página ${page}: ${err.message}`, err);
            }
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
                    checkRateLimit(mRes);
                    if (mRes.ok) {
                        const mHtml = await mRes.text();
                        const $m = cheerio.load(mHtml);
                        let foundInPage = 0;
                        $m('a[href*="/events/"]').each((_, a) => {
                            const href = $m(a).attr('href');
                            if (href && !href.endsWith('/events') && !href.includes('?')) {
                                const full = stopAndGoEventUrl(href);
                                if (!full) return;
                                eventPageUrls.add(full);
                                cyclingListingUrls.add(full);
                                foundInPage++;
                            }
                        });
                        if (foundInPage === 0) break; // Sem mais páginas para esta modalidade
                    } else {
                        await logError('SCRAPER', `Stop and Go: modalidade ${mod.id} indisponível (HTTP ${mRes.status})`);
                    }
                }
            } catch (err) {
                if (err.rateLimited) throw err;
                await logError('SCRAPER', `Stop and Go: falha na modalidade ${mod.id}: ${err.message}`, err);
            }
        }

        const allUrls = [...new Set([...eventPageUrls].map(stopAndGoEventUrl).filter(Boolean))];

        // Filtrar provas potenciais de ciclismo
        const currentYear = new Date().getFullYear();
        const years = options.years || [currentYear.toString(), (currentYear + 1).toString(), (currentYear - 1).toString()];

        const targetUrls = allUrls.filter(u => {
            const lower = u.toLowerCase();
            const hasExplicitYear = years.some(yr => lower.includes(yr));
            const hasNoYearInSlug = !lower.match(/\b20\d{2}\b/); // URLs sem ano no slug
            const matchesYear = hasExplicitYear || hasNoYearInSlug || options.fullHistorical;

            const isCycling = CYCLING_KEYWORDS.some(kw => lower.includes(kw));
            const isExcluded = NON_CYCLING.some(kw => lower.includes(kw) && !lower.includes('cycling') && !lower.includes('bike') && !lower.includes('btt') && !lower.includes('gravel') && !lower.includes('downhill'));
            // Yearless sitemap entries can be decades old. Accept them only
            // when also found on a current cycling listing; validate the header next.
            return matchesYear && (cyclingListingUrls.has(u) || (hasExplicitYear && isCycling && !isExcluded));
        });

        // A populated image/date does not prove this is a cycling event.
        const urlsToScrape = targetUrls;
        logInfo('SCRAPER', `Stop and Go: ${urlsToScrape.length} cabeçalhos de provas a validar...`);

        let savedOrMergedCount = 0;
        const BATCH_SIZE = 2;
        for (let i = 0; i < urlsToScrape.length; i += BATCH_SIZE) {
            const chunk = urlsToScrape.slice(i, i + BATCH_SIZE);
            const events = await Promise.all(chunk.map(url => scrapeEventPage(url, 2, { years })));
            for (const ev of events) {
                if (ev) {
                    await saveOrMergeEvent(prisma, ev, options);
                    savedOrMergedCount++;
                }
            }
            if (i + BATCH_SIZE < urlsToScrape.length) await new Promise(resolve => setTimeout(resolve, 1200));
        }

        logInfo('SCRAPER', `Stop and Go: ${savedOrMergedCount} provas de ciclismo processadas e fundidas com sucesso.`);
        return savedOrMergedCount;

    } catch (e) {
        await logError('SCRAPER', `Erro global no scraper Stop and Go: ${e.message}`, e);
        throw e;
    }
}
