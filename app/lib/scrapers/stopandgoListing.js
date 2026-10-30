import * as cheerio from 'cheerio';
import { CYCLING_MODALITIES, stopAndGoEventUrl } from './stopandgoParser.js';
import { assertSourceAccess, SOURCE_USER_AGENT } from './sourceAccess.js';
const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s*\/\s*/g,'/').trim();
export function readStopAndGoListing(html, filtered = false, pageUrl = 'https://stopandgo.net/events') {
    const $ = cheerio.load(html);
    const modalities = $('select[name="modality"] option').toArray().filter(element => CYCLING_MODALITIES.has(normalize($(element).text())))
        .map(element => $(element).attr('value')).filter(value => /^\d+$/.test(value || ''));
    const urls = new Set();
    const cards = $('a[data-ga4-event="select_item"]');
    (cards.length ? cards : $('a[href*="/events/"]')).each((_, element) => {
        let category = '';
        try { category = JSON.parse($(element).attr('data-ga4-params') || '{}').items?.[0]?.item_category2 || ''; } catch {}
        if (category && !CYCLING_MODALITIES.has(normalize(category))) return;
        if (!category && !filtered) return;
        const url = stopAndGoEventUrl($(element).attr('href'));
        if (url) urls.add(url);
    });
    const pages = [];
    for (const href of $('a[href]').map((_,element) => $(element).attr('href')).get()) {
        try {
            const url = new URL(href, pageUrl), current = new URL(pageUrl);
            if (url.origin !== 'https://stopandgo.net' || url.pathname !== '/events' || !/^[1-9]\d*$/.test(url.searchParams.get('page') || '')) continue;
            // Query-only pagination commonly omits the active filter values.
            for (const key of ['modality','status']) if (!url.searchParams.has(key) && current.searchParams.has(key)) url.searchParams.set(key,current.searchParams.get(key));
            url.hash='';url.searchParams.sort();pages.push(url.href);
        } catch { /* Ignore unrelated or malformed navigation. */ }
    }
    return { modalities:[...new Set(modalities)], urls:[...urls], pages:[...new Set(pages)] };
}
export async function fetchStopAndGoCyclingLinks(fetcher = fetch) {
    const read = async url => {
        const response = await fetcher(url, { headers:{'User-Agent':SOURCE_USER_AGENT}, signal:AbortSignal.timeout(10000) });
        assertSourceAccess(response, 'Stop and Go');
        if (!response.ok) throw new Error(`Listagem Stop and Go: HTTP ${response.status}`);
        return response.text();
    };
    const first = readStopAndGoListing(await read('https://stopandgo.net/events'));
    if (!first.modalities.length) throw new Error('Modalidades da listagem Stop and Go não confirmadas');
    const urls = new Set(first.urls);
    for (const modality of first.modalities) {
        const queue = [`https://stopandgo.net/events?modality=${modality}&status=S`];
        const visited = new Set();
        while (queue.length && visited.size < 50) {
            const url = queue.shift(); if (visited.has(url)) continue; visited.add(url);
            await new Promise(resolve => setTimeout(resolve,250));
            const page = readStopAndGoListing(await read(url), true, url);
            for (const event of page.urls) urls.add(event);
            for (const href of page.pages) {
                const candidate = new URL(href, url);
                if (candidate.searchParams.get('modality') === modality && candidate.searchParams.get('status') === 'S' && !visited.has(candidate.href)) queue.push(candidate.href);
            }
        }
        if (queue.some(url => !visited.has(url))) throw new Error('Stop and Go: limite de paginação atingido; listagem incompleta');
    }
    return urls;
}
