import { assertMinimalCollectionEnabled } from '../contentReleasePolicy.js';
import * as cheerio from 'cheerio';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { getTag, getAmbito } from './utils.js';
import { isCyclingCandidate } from './cyclingEvidence.js';
import { assertSourceAccess, SOURCE_USER_AGENT } from './sourceAccess.js';
import { parsePublishedRaceDate } from './publishedDates.js';

const BASE_URL = 'https://apedalar.pt';

export async function scrapeApedalar(prisma, year, options = {}) {
    const years = (Array.isArray(year) ? year : [year]).map(String);
    assertMinimalCollectionEnabled("Apedalar");
    logInfo('SCRAPER', 'Início da sincronização Apedalar');

    try {
        const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`, {
            headers: { 'User-Agent': SOURCE_USER_AGENT }, signal:AbortSignal.timeout(15000)
        });

        assertSourceAccess(sitemapRes, 'Apedalar');
        if (!sitemapRes.ok) throw new Error(`HTTP ${sitemapRes.status}`);

        const sitemapText = await sitemapRes.text();
        if (!/<(?:\w+:)?urlset[\s>]/i.test(sitemapText)) throw new Error('Apedalar: sitemap de eventos não reconhecido; recolha incompleta');
        const urls = new Set();
        const regex = /<loc>(https:\/\/apedalar\.pt\/eventos\/[^<]+)<\/loc>/g;
        let match;
        while ((match = regex.exec(sitemapText)) !== null) {
            urls.add(match[1]);
        }

        logInfo('SCRAPER', `Encontrados ${urls.size} eventos no sitemap da Apedalar`);

        for (const url of urls) {
            try {
                // Throttle
                await new Promise(r => setTimeout(r, 1000));

                const eventRes = await fetch(url, {
                    headers: { 'User-Agent': SOURCE_USER_AGENT }, signal:AbortSignal.timeout(10000)
                });

                assertSourceAccess(eventRes, 'Apedalar');
                if (!eventRes.ok) {
                    if (eventRes.status !== 404 && eventRes.status !== 410) await logError('SCRAPER', `Apedalar: HTTP ${eventRes.status} em ${url}`);
                    continue;
                }

                const html = await eventRes.text();
                const $ = cheerio.load(html);

                const title = $('h1').first().text().trim();
                if (!title) continue;

                // Archived/result layouts can omit QUANDO but still publish
                // the precise event date in their own Open Graph date label.
                const rawDate = $('h2:contains("QUANDO?")').next('div').text().trim() || $('meta[property="og:description"]').attr('content') || '';
                if (!rawDate || !years.some(value => rawDate.includes(value))) continue;

                const parsed = parsePublishedRaceDate(rawDate);
                if (!parsed) continue;
                if (parsed.endDate < new Date().toISOString().slice(0,10)) continue;
                const {date,sortDate} = parsed;
                const [yearStr,month,day] = sortDate.toISOString().slice(0,10).split('-');

                const local = $('h2:contains("ONDE?")').next('div').text().trim().replace(/\s+/g, ' ');
                const eventObj = {
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

            } catch (err) {
                await logError('SCRAPER', `Erro a processar Apedalar ${url}: ${err.message}`);
                if (err.retryable === false) throw err;
            }
        }
        logInfo('SCRAPER', 'Apedalar: concluído.');
    } catch (e) {
        await logError('SCRAPER', 'Falha crítica em Apedalar: ' + e.message);
        throw e;
    }
}

function isCyclingEvent(title, returnBool = false) {
    return returnBool ? isCyclingCandidate(title, true) : null;
}
