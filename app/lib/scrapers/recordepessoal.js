import { assertMinimalCollectionEnabled } from '../contentReleasePolicy.js';
import * as cheerio from 'cheerio';
import { logInfo, logError } from '../logger.js';
import { prisma } from '../db.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { getTag, getAmbito } from './utils.js';
import { isCyclingCandidate } from './cyclingEvidence.js';
import { assertSourceAccess, SOURCE_USER_AGENT } from './sourceAccess.js';
import { parsePublishedRaceDate } from './publishedDates.js';
import {createCollectionAudit} from './collectionAudit.js';

const BASE_URL = 'https://www.recordepessoal.pt';

export async function scrapeRecordePessoal(options = {}) {
    assertMinimalCollectionEnabled("Recorde Pessoal");
    const years=(options.years || [new Date().getFullYear(),new Date().getFullYear()+1]).map(String);
    const audit=createCollectionAudit('Recorde Pessoal',options,{logInfo,logError});
    const allEvents = [];

    await logInfo('SCRAPER', 'Início da sincronização Recorde Pessoal');

    try {
        const categories = ['btt', 'ciclismo-de-estrada'];
        const eventLinks = new Map();

        for (const cat of categories) {
            const res = await fetch(`${BASE_URL}/eventos?cat=${cat}&pagina=-1`, {
                headers: { 'User-Agent': SOURCE_USER_AGENT }, signal:AbortSignal.timeout(15000)
            });

            assertSourceAccess(res, 'Recorde Pessoal');
            if (!res.ok) {
                await logError('SCRAPER', `Falha ao aceder à categoria ${cat} (HTTP ${res.status})`);
                continue;
            }

            const html = await res.text();
            const $ = cheerio.load(html);
            if (!$('.evento').length && !$('#eventosDiv').text().includes('Não existem eventos')) {
                await logError('SCRAPER', `Recorde Pessoal: listagem ${cat} não reconhecida; recolha incompleta`);
            }

            $('.evento').each((i, el) => {
                const title = $(el).find('.titulo').first().text().trim();
                const rawLink = $(el).attr('data-evento');
                if (rawLink && isCyclingEvent(title, cat)) {
                    const cleanLink = rawLink.replace(/"/g, '');
                    try {
                        const url = new URL(cleanLink, BASE_URL);
                        if (url.origin === BASE_URL && /^\/evento\/[^/]+\/?$/.test(url.pathname)) {
                            url.hash='';const categories=eventLinks.get(url.href)||new Set();categories.add(cat);eventLinks.set(url.href,categories);
                        }
                    } catch { /* Ignore malformed links, not the remaining category. */ }
                }
            });
        }

        const eventLinksArray = Array.from(eventLinks.keys());
        audit.discover(eventLinksArray);
        await logInfo('SCRAPER', `Encontrados ${eventLinksArray.length} eventos de Ciclismo na Recorde Pessoal`);

        for (const link of eventLinksArray) {
            try {
                // Throttle
                await new Promise(r => setTimeout(r, 1000));

                const pageRes = await fetch(link, { headers: { 'User-Agent': SOURCE_USER_AGENT }, signal:AbortSignal.timeout(10000) });
                assertSourceAccess(pageRes, 'Recorde Pessoal');
                if (!pageRes.ok) {
                    if ([404,410].includes(pageRes.status)) audit.resolve(link,'unavailable');
                    else await audit.fail(link,`HTTP ${pageRes.status}`);
                    continue;
                }

                const pageHtml = await pageRes.text();
                const $p = cheerio.load(pageHtml);

                const title = $p('.eventoTitulo .titulosPaginasBold').text().trim();
                const local = $p('.localEvento div').eq(1).text().trim();
                const dataRaw = $p('.dataEvento div').eq(1).text().trim(); // ex: 11 Outubro 2026

                const parsed = parsePublishedRaceDate(dataRaw);
                if (!title || !parsed) {await audit.fail(link,'título/data não reconhecidos');continue;}
                if (!isCyclingCandidate(title,true)) {audit.resolve(link,'nonCycling');continue;}
                if (parsed.endDate < new Date().toISOString().slice(0,10)) {audit.resolve(link,'past');continue;}
                const cleanDate = parsed.date, sortDateStr = parsed.sortDate.toISOString();

                const eventObj = {
                    tag:getTag(title) || (eventLinks.get(link).size===1 ? (eventLinks.get(link).has('btt') ? 'BTT' : 'Estrada') : ''), ambito:getAmbito(title, '', '', 'Recorde Pessoal'),
                    id: `recordepessoal-${link.split('/').pop()}-${cleanDate.replace(/ /g, '-')}`.toLowerCase(),
                    title,
                    date: cleanDate,
                    sortDate: sortDateStr,
                    details: local,
                    source: 'Recorde Pessoal',
                    link,
                };

                if (years.some(value=>value>=parsed.sortDate.getUTCFullYear().toString()&&value<=parsed.endDate.slice(0,4))) {
                    await saveOrMergeEvent(prisma, eventObj, { ...options, verifiedSource: 'Recorde Pessoal' });
                    allEvents.push(eventObj);
                    audit.resolve(link,'saved');
                } else audit.resolve(link,'outsideYears');

            } catch(e) {
                await audit.fail(link,e.message);
                if (e.retryable === false) throw e;
            }
        }

        return allEvents.length;

    } catch (e) {
        await logError('SCRAPER', `Falha ao sincronizar Recorde Pessoal: ${e.message}`);
        throw e;
    } finally {
        await audit.finish();
    }
}

function isCyclingEvent(title, cat) {
    return isCyclingCandidate(title, ['btt','ciclismo-de-estrada'].includes(cat));
}
