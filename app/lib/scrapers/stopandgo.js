import { assertMinimalCollectionEnabled } from '../contentReleasePolicy.js';
import * as cheerio from 'cheerio';
import { prisma } from '../db.js';
import { toTitleCase, parsePTDateToISO, getAmbito, getTag } from './utils.js';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { NON_CYCLING, isValidHeader } from './stopandgoParser.js';
import { parseRegistrationDates } from '../../utils/registrationDates.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

export const deepScrapeStopAndGo = async (url) => {
    let opensAt = null, closesAt = null;
    try {
        await delay(500); // Polite delay
        const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
        if (!response.ok) return { opensAt, closesAt };
        
        const html = await response.text();
        const $ = cheerio.load(html);
        
        const dates = parseRegistrationDates($('body').html());
        opensAt = dates.registrationOpensAt ? new Date(dates.registrationOpensAt) : null;
        closesAt = dates.registrationClosesAt ? new Date(dates.registrationClosesAt) : null;
        
        return { opensAt, closesAt };
    } catch(e) {
        return { opensAt: null, closesAt: null };
    }
}

export const scrapeStopAndGo = async (options = {}) => {
    assertMinimalCollectionEnabled("Stop and Go");
    let processedCount = 0;
    try {
        logInfo('SCRAPER', 'Início da sincronização Stop and Go (sitemap.xml + abas Downhill, Gravel, BTT, Estrada)');

        const res = await fetch('https://stopandgo.net/sitemap.xml', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000)
        });
        if (!res.ok) throw new Error(Falha no sitemap.xml: HTTP );
        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        const sitemapUrls = [];
        $('url loc').each((_, el) => {
            const u = $(el).text();
            if (u.includes('/events/') && !u.includes('/results')) sitemapUrls.push(u);
        });

        const cyclingListingUrls = new Set();
        
        const targetUrls = sitemapUrls.filter(u => {
            const lower = u.toLowerCase();
            const hasExplicitYear = /202\d/.test(lower);
            const isCycling = lower.includes('btt') || lower.includes('gravel') || lower.includes('downhill') || lower.includes('cycling') || lower.includes('bike');
            const isExcluded = NON_CYCLING.some(kw => lower.includes(kw) && !lower.includes('cycling') && !lower.includes('bike') && !lower.includes('btt') && !lower.includes('gravel') && !lower.includes('downhill'));
            return (cyclingListingUrls.has(u) || (hasExplicitYear && isCycling && !isExcluded));
        });

        const urlsToScrape = targetUrls;
        logInfo('SCRAPER', Stop and Go:  cabeçalhos de provas a validar...);

        const BATCH_SIZE = 4;
        const todayZero = new Date();
        todayZero.setHours(0, 0, 0, 0);

        for (let i = 0; i < urlsToScrape.length; i += BATCH_SIZE) {
            const batchUrls = urlsToScrape.slice(i, i + BATCH_SIZE);
            await Promise.all(batchUrls.map(async (url) => {
                try {
                    let header = null;
                    let retries = 1;
                    for (let attempt = 0; attempt <= retries; attempt++) {
                        try {
                            const evtRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
                            if (evtRes.ok) {
                                const evtHtml = await evtRes.text();
                                header = isValidHeader(url, evtHtml);
                                break;
                            }
                        } catch(e) {}
                        await delay(500);
                    }
                    
                    if (!header || !header.cycling || !header.sortDate) return;
                    
                    if (new Date(header.sortDate) < todayZero) return; // ONLY PROCESS FUTURE EVENTS

                    const slug = url.split('/').filter(Boolean).pop();
                    const id = 'stopandgo-' + slug;
                    
                    const { opensAt, closesAt } = await deepScrapeStopAndGo(url);
                    
                    const eventData = {
                        title: toTitleCase(header.title),
                        date: header.date,
                        sortDate: header.sortDate,
                        details: header.location,
                        source: 'Stop and Go',
                        link: url,
                        ...(opensAt && { registrationOpensAt: opensAt }),
                        ...(closesAt && { registrationClosesAt: closesAt })
                    };

                    await saveOrMergeEvent(prisma, { id, ...eventData }, { ...options, verifiedSource: 'Stop and Go' });
                    processedCount++;
                } catch (err) {
                    await logError('SCRAPER', Erro a processar Stop and Go url : );
                }
            }));
            await delay(1000); // Polite delay between batches
        }

        await logInfo('SCRAPER', Sincronização Stop and Go concluída ( provas futuras processadas na BD));
        return processedCount;
    } catch (err) {
        await logError('SCRAPER', Erro no scraping Stop and Go: , err);
        throw err;
    }
};
