import * as cheerio from 'cheerio';
import { CYCLING_MODALITIES, stopAndGoEventUrl } from './stopandgoParser.js';
const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s*\/\s*/g,'/').trim();
export function readStopAndGoListing(html, filtered = false) {
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
    const pages = $('a[href]').map((_,element) => $(element).attr('href')).get().filter(href => {
        try { const url = new URL(href,'https://stopandgo.net'); return url.origin === 'https://stopandgo.net' && url.pathname === '/events' &&
            /^\d+$/.test(url.searchParams.get('page') || '') && Number(url.searchParams.get('page')) <= 10; } catch { return false; }
    });
    return { modalities, urls:[...urls], pages:[...new Set(pages)] };
}
export async function fetchStopAndGoCyclingLinks(fetcher = fetch) {
    const read = async url => {
        const response = await fetcher(url, { signal:AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error(`Listagem Stop and Go: HTTP ${response.status}`);
        return response.text();
    };
    const first = readStopAndGoListing(await read('https://stopandgo.net/events'));
    if (!first.modalities.length) throw new Error('Modalidades da listagem Stop and Go não confirmadas');
    const urls = new Set(first.urls);
    for (const modality of first.modalities) {
        const queue = [`https://stopandgo.net/events?status=S&modality=${modality}`];
        const visited = new Set();
        while (queue.length && visited.size < 10) {
            const url = queue.shift(); if (visited.has(url)) continue; visited.add(url);
            await new Promise(resolve => setTimeout(resolve,250));
            const page = readStopAndGoListing(await read(url), true);
            for (const event of page.urls) urls.add(event);
            for (const href of page.pages) {
                const candidate = new URL(href, url);
                if (candidate.searchParams.get('modality') === modality && candidate.searchParams.get('status') === 'S' && !visited.has(candidate.href)) queue.push(candidate.href);
            }
        }
    }
    return urls;
}
