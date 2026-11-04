import { assertMinimalCollectionEnabled } from '../contentReleasePolicy.js';
import * as cheerio from 'cheerio';
import { prisma } from '../db.js';
import { toTitleCase, getAmbito, getTag } from './utils.js';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { readStopAndGoHeader, stopAndGoEventUrl } from './stopandgoParser.js';
import { fetchStopAndGoCyclingLinks } from './stopandgoListing.js';
import { parseRegistrationDates } from '../../utils/registrationDates.js';
import { detectRaceDate } from '../../utils/detectRaceDate.js';
import { assertSourceAccess } from './sourceAccess.js';
import { createStopAndGoAccess } from './stopandgoAccess.js';
import {fetchSitemapUrls} from './sitemapDiscovery.js';
import {createCollectionAudit,settleSourceBatch} from './collectionAudit.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

export const deepScrapeStopAndGo = async (url, existingHtml = null, sourceFetch = createStopAndGoAccess({db:prisma})) => {
    let opensAt = null, closesAt = null;
    try {
        // The main scraper already downloaded this page: reuse it for deadlines.
        // Standalone callers can still request the page when no HTML is available.
        let html = existingHtml;
        if (html === null) {
            const response = await sourceFetch(url);
            assertSourceAccess(response, 'Stop and Go');
            if (!response.ok) return { opensAt, closesAt };
            html = await response.text();
        }
        const $ = cheerio.load(html);

        const dates = parseRegistrationDates($('body').html());
        opensAt = dates.registrationOpensAt ? new Date(dates.registrationOpensAt) : null;
        closesAt = dates.registrationClosesAt ? new Date(dates.registrationClosesAt) : null;

        return { opensAt, closesAt };
    } catch(e) {
        if (e.retryable === false) throw e;
        return { opensAt: null, closesAt: null };
    }
}

export const scrapeStopAndGo = async (options = {}) => {
    assertMinimalCollectionEnabled("Stop and Go");
    const progress=options.progress;
    const audit=createCollectionAudit('Stop and Go',{...options,coverageState:progress?.outcomes},{logInfo,logError});
    const stageStarted=Date.now();
    const sourceFetch=createStopAndGoAccess({db:prisma,deadline:stageStarted+220000,notBefore:progress?.notBefore||0});
    let processedCount = 0, continuation = null;
    try {
        let urlsToScrape;
        if(progress) {
            if(!Array.isArray(progress.urls)||!Number.isInteger(progress.nextIndex)||progress.nextIndex<0||progress.nextIndex>progress.urls.length)throw Error('Stop and Go: estado de continuação inválido');
            urlsToScrape=progress.urls;
        } else {
            await logInfo('SCRAPER', 'Início da sincronização Stop and Go (sitemap.xml + modalidades de ciclismo)');
            let sitemapUrls=new Set();
            try {sitemapUrls=await fetchSitemapUrls('https://stopandgo.net/sitemap.xml',{source:'Stop and Go',fetcher:sourceFetch,eventUrl:stopAndGoEventUrl,onError:error=>logError('SCRAPER',`Stop and Go: ${error.message}`)});}
            catch(error){if(error.retryable===false)throw error;await logError('SCRAPER',`Stop and Go: ${error.message}`);}

            let cyclingListingUrls = new Set();
            try { cyclingListingUrls = await fetchStopAndGoCyclingLinks(sourceFetch,{onError:error=>logError('SCRAPER',error.message)}); }
            catch (error) { if (error.retryable === false) throw error; await logError('SCRAPER', error.message); }

            const CYCLING_TERMS = ['btt', 'gravel', 'downhill', 'cycling', 'bike', 'granfondo', 'grandfondo', 'racenature', 'maratona', 'resistencia', 'raid', 'xcm', 'xco', 'dhi', 'dhu', 'ciclocrosse', 'ciclismo'];
            const years = (options.years || [new Date().getFullYear(),new Date().getFullYear()+1]).map(String);
            const targetUrls = [...new Set([...sitemapUrls,...cyclingListingUrls])].filter(u => {
                const lower = u.toLowerCase();
                const hasExplicitYear = years.some(year => lower.includes(year));
                const isCycling = CYCLING_TERMS.some(term => lower.includes(term));
                const hasYear=/\b20\d{2}\b/.test(lower.replace(/[_-]/g,' '));
                // Current-year neutral slugs and yearless cycling pages need their
                // factual header checked, rather than exclusion by URL wording.
                return cyclingListingUrls.has(u) || hasExplicitYear || (!hasYear && isCycling);
            });

            // Current cycling listings first; sitemap-only candidates remain in the queue.
            urlsToScrape = [...targetUrls].sort((a,b)=>Number(cyclingListingUrls.has(b))-Number(cyclingListingUrls.has(a)));
            audit.discover(urlsToScrape);
            await logInfo('SCRAPER', `Stop and Go: ${urlsToScrape.length} cabeçalhos de provas a validar...`);
            }

            const todayZero = new Date();
            todayZero.setHours(0, 0, 0, 0);

            for (let i = progress?.nextIndex || 0; i < urlsToScrape.length; i++) {
                // Each durable workflow step stays comfortably inside the server limit.
                // Never restart discovery or already settled pages in the next step.
                if(i-(progress?.nextIndex||0)>=60 || Date.now()-stageStarted>=180000) {
                continuation={urls:urlsToScrape,nextIndex:i,outcomes:audit.checkpoint(),notBefore:sourceFetch.nextAllowedAt?.()||Date.now()+2000};
                    return {continuation};
                }
                const url=urlsToScrape[i];
                await settleSourceBatch([url],async (url) => {
                    try {
                        let header = null;
                        let eventHtml = null;
                        let retries = 1;
                        for (let attempt = 0; attempt <= retries; attempt++) {
                            try {
                                const evtRes = await sourceFetch(url);
                                if (evtRes.ok) {
                                    const evtHtml = await evtRes.text();
                                    header = readStopAndGoHeader(evtHtml);
                                    eventHtml = evtHtml;
                                    break;
                                }
                                assertSourceAccess(evtRes, 'Stop and Go');
                                if ([404,410].includes(evtRes.status)) {audit.resolve(url,'unavailable');return;}
                            } catch(e) { if (e.code === 'SOURCE_ACCESS_DENIED') throw e; }
                            await delay(500);
                        }

                        if (!header || !header.knownModality || (header.cycling && !header.sortDate)) {
                            await audit.fail(url,'cabeçalho/modalidade/data não reconhecidos');
                            return;
                        }
                        if (!header.cycling) {audit.resolve(url,'nonCycling');return;}

                        const raceDates = detectRaceDate({ date: header.date, sortDate: header.sortDate });
                        const effectiveEnd = raceDates?.raceEndDateISO ? new Date(raceDates.raceEndDateISO + 'T23:59:59.999Z') : new Date(header.sortDate);
                        if (effectiveEnd < todayZero) {audit.resolve(url,'past');return;}

                        const slug = url.split('/').filter(Boolean).pop();
                        const id = 'stopandgo-' + slug;

                        const { opensAt, closesAt } = await deepScrapeStopAndGo(url, eventHtml, sourceFetch);

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
                        audit.resolve(url,'saved');
                    } catch (err) {
                        await audit.fail(url,err.message);
                        if (err.code === 'SOURCE_ACCESS_DENIED') throw err;
                    }
                });
            }

            await logInfo('SCRAPER', `Sincronização Stop and Go concluída (${audit.counts().saved} provas futuras processadas na BD)`);
            return processedCount;
        } catch (err) {
            await logError('SCRAPER', `Erro no scraping Stop and Go: ${err.message}`, err);
            throw err;
        } finally {
            if(continuation)await options.onCoverage?.(audit.counts());
            else await audit.finish();
        }
    };
