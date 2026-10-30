import { assertMinimalCollectionEnabled } from '../contentReleasePolicy.js';
import * as cheerio from 'cheerio';
import { logInfo, logError } from '../logger.js';
import { prisma } from '../db.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { getTag, getAmbito } from './utils.js';
import { isCyclingCandidate } from './cyclingEvidence.js';
import { assertSourceAccess, SOURCE_USER_AGENT } from './sourceAccess.js';
import { parsePublishedRaceDate } from './publishedDates.js';

const BASE_URL = 'https://www.recordepessoal.pt';

export async function scrapeRecordePessoal(options = {}) {
    assertMinimalCollectionEnabled("Recorde Pessoal");
    const { years = [new Date().getFullYear().toString()] } = options;
    const allEvents = [];

    logInfo('SCRAPER', 'Início da sincronização Recorde Pessoal');

    try {
        const categories = ['btt', 'ciclismo-de-estrada'];
        const eventLinks = new Map();

        for (const cat of categories) {
            const res = await fetch(`${BASE_URL}/eventos?cat=${cat}&pagina=-1`, {
                headers: { 'User-Agent': SOURCE_USER_AGENT }, signal:AbortSignal.timeout(15000)
            });

            assertSourceAccess(res, 'Recorde Pessoal');
            if (!res.ok) {
                logError('SCRAPER', `Falha ao aceder à categoria ${cat} (HTTP ${res.status})`);
                continue;
            }

            const html = await res.text();
            const $ = cheerio.load(html);

            $('.evento').each((i, el) => {
                const title = $(el).find('.titulo').first().text().trim();
                const rawLink = $(el).attr('data-evento');
                if (rawLink && isCyclingEvent(title, cat)) {
                    const cleanLink = rawLink.replace(/"/g, '');
                    try {
                        const url = new URL(cleanLink, BASE_URL);
                        if (url.origin === BASE_URL && url.pathname.startsWith('/evento/')) eventLinks.set(url.href, cat);
                    } catch { /* Ignore malformed links, not the remaining category. */ }
                }
            });
        }

        const eventLinksArray = Array.from(eventLinks.keys());
        logInfo('SCRAPER', `Encontrados ${eventLinksArray.length} eventos de Ciclismo na Recorde Pessoal`);

        for (const link of eventLinksArray) {
            try {
                // Throttle
                await new Promise(r => setTimeout(r, 1000));

                const pageRes = await fetch(link, { headers: { 'User-Agent': SOURCE_USER_AGENT }, signal:AbortSignal.timeout(10000) });
                assertSourceAccess(pageRes, 'Recorde Pessoal');
                if (!pageRes.ok) {
                    if (pageRes.status !== 404 && pageRes.status !== 410) await logError('SCRAPER', `Recorde Pessoal: HTTP ${pageRes.status} em ${link}`);
                    continue;
                }

                const pageHtml = await pageRes.text();
                const $p = cheerio.load(pageHtml);

                const title = $p('.eventoTitulo .titulosPaginasBold').text().trim();
                const local = $p('.localEvento div').eq(1).text().trim();
                const dataRaw = $p('.dataEvento div').eq(1).text().trim(); // ex: 11 Outubro 2026

                const parsed = parsePublishedRaceDate(dataRaw);
                if (!title || !parsed) continue;
                if (parsed.endDate < new Date().toISOString().slice(0,10)) continue;
                const cleanDate = parsed.date, sortDateStr = parsed.sortDate.toISOString();

                const eventObj = {
                    tag:getTag(title) || (eventLinks.get(link) === 'btt' ? 'BTT' : 'Estrada'), ambito:getAmbito(title, '', '', 'Recorde Pessoal'),
                    id: `recordepessoal-${link.split('/').pop()}-${cleanDate.replace(/ /g, '-')}`.toLowerCase(),
                    title,
                    date: cleanDate,
                    sortDate: sortDateStr,
                    details: local,
                    source: 'Recorde Pessoal',
                    link,
                };

                if (years.includes(new Date(sortDateStr).getFullYear().toString())) {
                    await saveOrMergeEvent(prisma, eventObj, { ...options, verifiedSource: 'Recorde Pessoal' });
                    allEvents.push(eventObj);
                }

            } catch(e) {
                logError('SCRAPER', `Erro a processar prova Recorde Pessoal (${link}): ${e.message}`);
                if (e.retryable === false) throw e;
            }
        }

        return allEvents.length;

    } catch (e) {
        logError('SCRAPER', `Falha ao sincronizar Recorde Pessoal: ${e.message}`);
        throw e;
    }
}

function isCyclingEvent(title, cat) {
    return isCyclingCandidate(title, ['btt','ciclismo-de-estrada'].includes(cat));
}
