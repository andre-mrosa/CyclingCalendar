import { assertMinimalCollectionEnabled } from '../contentReleasePolicy.js';
import * as cheerio from 'cheerio';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { getTag, getAmbito } from './utils.js';
import { isCyclingCandidate } from './cyclingEvidence.js';
import { assertSourceAccess } from './sourceAccess.js';
import { parsePublishedRaceDate } from './publishedDates.js';
import {categoryOptions} from './publishedCategories.js';
import {fetchSitemapUrls} from './sitemapDiscovery.js';
import {createCollectionAudit} from './collectionAudit.js';
import {fetchApedalarPage} from './apedalarPage.js';

const BASE_URL = 'https://apedalar.pt';

export async function scrapeApedalar(prisma, year, options = {}) {
    const years = (Array.isArray(year) ? year : [year]).map(String);
    assertMinimalCollectionEnabled("Apedalar");
    const audit=createCollectionAudit('Apedalar',options,{logInfo,logError});
    await logInfo('SCRAPER', 'Início da sincronização Apedalar');

    try {
        const urls = await fetchSitemapUrls(`${BASE_URL}/sitemap.xml`,{source:'Apedalar',onError:error=>logError('SCRAPER',`Apedalar: ${error.message}`),eventUrl:value=>{
            const url=new URL(value); return /^\/eventos\/(?:info\/)?[^/]+\/?$/.test(url.pathname)?url.href:null;
        }});
        if (!urls.size) throw new Error('Apedalar: sitemap sem páginas de provas; confirmar estrutura');
        audit.discover(urls);
        await logInfo('SCRAPER', `Encontrados ${urls.size} eventos no sitemap da Apedalar`);

        for (const url of urls) {
            try {
                // Throttle
                await new Promise(r => setTimeout(r, 1000));

                const page = await fetchApedalarPage(url);
                if(page.unavailable) {
                    audit.resolve(url,'unavailable');
                    await logInfo('SCRAPER',`Apedalar: página de prova indisponível em ${url}`,{event:'source-page-unavailable',url,reason:page.unavailable});
                    continue;
                }
                const eventRes = page.response;

                assertSourceAccess(eventRes, 'Apedalar');
                if (!eventRes.ok) {
                    if ([404,410].includes(eventRes.status)) audit.resolve(url,'unavailable');
                    else await audit.fail(url,`HTTP ${eventRes.status}`);
                    continue;
                }

                const html = await eventRes.text();
                const $ = cheerio.load(html);

                const title = $('h1').first().text().trim();
                if (!title) {await audit.fail(url,'título não reconhecido');continue;}
                if (!isCyclingEvent(title, true)) {audit.resolve(url,'nonCycling');continue;}

                // Archived/result layouts can omit QUANDO but still publish
                // the precise event date in their own Open Graph date label.
                const rawDate = $('h2:contains("QUANDO?")').next('div').text().trim() || $('meta[property="og:description"]').attr('content') || '';
                if(!rawDate && /^pr[oó]ximos eventos$/i.test(title)) {
                    audit.resolve(url,'unavailable');
                    await logInfo('SCRAPER',`Apedalar: endereço sem página individual de prova em ${url}`,{event:'source-page-unavailable',url,reason:'Página genérica sem data ou metadados da prova.'});
                    continue;
                }
                const parsed = parsePublishedRaceDate(rawDate);
                if (!parsed) {await audit.fail(url,'data não reconhecida');continue;}
                if (parsed.endDate < new Date().toISOString().slice(0,10)) {audit.resolve(url,'past');continue;}
                if (!years.some(value=>value>=parsed.sortDate.getUTCFullYear().toString()&&value<=parsed.endDate.slice(0,4))) {audit.resolve(url,'outsideYears');continue;}
                const {date,sortDate} = parsed;
                const [yearStr,month,day] = sortDate.toISOString().slice(0,10).split('-');

                const local = $('h2:contains("ONDE?")').next('div').text().trim().replace(/\s+/g, ' ');
                const eventObj = {
                    publishedCategories:categoryOptions(html),
                    tag:getTag(title), ambito:getAmbito(title, '', '', 'Apedalar'),
                    id: `apedalar-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${day}-${month}-${yearStr}`,
                    title,
                    date,
                    sortDate,
                    details: local,
                    source: 'Apedalar',
                    link: url,
                };

                // Prevent non-cycling events if possible (though apedalar is almost 100% cycling, they might have trails)
                if (!isCyclingEvent(title, true)) continue;

                await saveOrMergeEvent(prisma, eventObj, { ...options, verifiedSource: 'Apedalar' });
                audit.resolve(url,'saved');

            } catch (err) {
                await audit.fail(url,err.message);
                if (err.retryable === false) throw err;
            }
        }
        logInfo('SCRAPER', 'Apedalar: concluído.');
    } catch (e) {
        await logError('SCRAPER', 'Falha crítica em Apedalar: ' + e.message);
        throw e;
    } finally {
        await audit.finish();
    }
}

function isCyclingEvent(title, returnBool = false) {
    return returnBool ? isCyclingCandidate(title, true) : null;
}
