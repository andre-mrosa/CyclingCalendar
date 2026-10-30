import { assertMinimalCollectionEnabled } from '../contentReleasePolicy.js';
import * as cheerio from 'cheerio';
import { prisma } from '../db.js';
import { toTitleCase, parsePTDateToISO, getAmbito, getTag } from './utils.js';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { CYCLING_MODALITIES, readStopAndGoHeader, stopAndGoEventUrl } from './stopandgoParser.js';
import { fetchStopAndGoCyclingLinks } from './stopandgoListing.js';
import { parseRegistrationDates } from '../../utils/registrationDates.js';
import { detectRaceDate } from '../../utils/detectRaceDate.js';

const delay = ms => new Promise(res => setTimeout(res, ms));
const NON_CYCLING = ['atletismo', 'trail', 'tt', 'skyrunning', 'urban trail', 'triathlon', 'triatlo', 'canoagem', 'natacao', 'trichallenge', 'caminhada', 'multisport', 'obstaculos'];

export const deepScrapeStopAndGo = async (url, existingHtml = null) => {
    let opensAt = null, closesAt = null;
    try {
        // The main scraper already downloaded this page: reuse it for deadlines.
        // Standalone callers can still request the page when no HTML is available.
        let html = existingHtml;
        if (html === null) {
            await delay(500);
            const response = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
            if (!response.ok) return { opensAt, closesAt };
            html = await response.text();
        }
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
        if (!res.ok) throw new Error(`Falha no sitemap.xml: HTTP ${res.status}`);
        const xml = await res.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        const sitemapUrls = [];
        $('url loc').each((_, el) => {
            const u = $(el).text();
            if (u.includes('/events/') && !u.includes('/results')) {
                const canonical = stopAndGoEventUrl(u); if (canonical) sitemapUrls.push(canonical);
            }
        });

        let cyclingListingUrls = new Set();
        try { cyclingListingUrls = await fetchStopAndGoCyclingLinks(); }
        catch (error) { await logError('SCRAPER', error.message); }
        
        const CYCLING_TERMS = ['btt', 'gravel', 'downhill', 'cycling', 'bike', 'granfondo', 'grandfondo', 'racenature', 'maratona', 'resistencia', 'raid', 'xcm', 'xco', 'dhi', 'dhu', 'ciclocrosse', 'ciclismo'];
        const years = [new Date().getFullYear(),new Date().getFullYear()+1].map(String);
        const targetUrls = [...new Set([...sitemapUrls,...cyclingListingUrls])].filter(u => {
            const lower = u.toLowerCase();
            const hasExplicitYear = years.some(year => lower.includes(year));
            const isCycling = CYCLING_TERMS.some(term => lower.includes(term));
            const isExcluded = NON_CYCLING.some(kw => lower.includes(kw) && !CYCLING_TERMS.some(term => lower.includes(term)));
            return (cyclingListingUrls.has(u) || (hasExplicitYear && isCycling && !isExcluded));
        });

        const urlsToScrape = targetUrls;
        logInfo('SCRAPER', `Stop and Go: ${urlsToScrape.length} cabeçalhos de provas a validar...`);

        const BATCH_SIZE = 4;
        const todayZero = new Date();
        todayZero.setHours(0, 0, 0, 0);

        for (let i = 0; i < urlsToScrape.length; i += BATCH_SIZE) {
            const batchUrls = urlsToScrape.slice(i, i + BATCH_SIZE);
            await Promise.all(batchUrls.map(async (url) => {
                try {
                    let header = null;
                    let eventHtml = null;
                    let retries = 1;
                    for (let attempt = 0; attempt <= retries; attempt++) {
                        try {
                            const evtRes = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(6000) });
                            if (evtRes.ok) {
                                const evtHtml = await evtRes.text();
                                header = readStopAndGoHeader(evtHtml);
                                eventHtml = evtHtml;
                                break;
                            }
                            if ([401,403,429].includes(evtRes.status)) throw Object.assign(new Error(`Stop and Go recusou acesso (HTTP ${evtRes.status})`), { code:'SOURCE_ACCESS_DENIED' });
                            if (evtRes.status === 404) break;
                        } catch(e) { if (e.code === 'SOURCE_ACCESS_DENIED') throw e; }
                        await delay(500);
                    }
                    
                    if (!header || !header.cycling || !header.sortDate) return;
                    
                    const raceDates = detectRaceDate({ date: header.date, sortDate: header.sortDate });
                    const effectiveEnd = raceDates?.raceEndDateISO ? new Date(raceDates.raceEndDateISO + 'T23:59:59.999Z') : new Date(header.sortDate);
                    if (effectiveEnd < todayZero) return; // ONLY PROCESS FUTURE OR ONGOING EVENTS

                    const slug = url.split('/').filter(Boolean).pop();
                    const id = 'stopandgo-' + slug;
                    
                    const { opensAt, closesAt } = await deepScrapeStopAndGo(url, eventHtml);
                    
                    const eventData = {
                        tag:getTag(header.title, header.modality), ambito:getAmbito(header.title, '', '', 'Stop and Go'),
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
                    await logError('SCRAPER', `Erro a processar Stop and Go url ${url}: ${err.message}`);
                    if (err.code === 'SOURCE_ACCESS_DENIED') throw err;
                }
            }));
            await delay(1000); // Polite delay between batches
        }

        await logInfo('SCRAPER', `Sincronização Stop and Go concluída (${processedCount} provas futuras processadas na BD)`);
        return processedCount;
    } catch (err) {
        await logError('SCRAPER', `Erro no scraping Stop and Go: ${err.message}`, err);
        throw err;
    }
};
