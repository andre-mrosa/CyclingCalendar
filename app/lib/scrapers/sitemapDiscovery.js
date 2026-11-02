import * as cheerio from 'cheerio';
import {assertSourceAccess, SOURCE_USER_AGENT} from './sourceAccess.js';

export function parseSitemap(xml) {
    if(!/<(?:\w+:)?(urlset|sitemapindex)\b[^>]*\/>/.test(xml)&&!/<\/(?:\w+:)?(?:urlset|sitemapindex)\s*>/.test(xml))throw new Error('Sitemap truncado; recolha incompleta');
    const $ = cheerio.load(xml, {xmlMode:true});
    const nodes = name => $('*').filter((_, el) => el.name?.split(':').pop() === name);
    const kind = nodes('sitemapindex').length ? 'index' : nodes('urlset').length ? 'urls' : null;
    if (!kind) throw new Error('Sitemap não reconhecido; recolha incompleta');
    const entries = nodes(kind === 'index' ? 'sitemap' : 'url').toArray().map(el => $(el).children().filter((_, child) => child.name?.split(':').pop() === 'loc').text().trim());
    if(entries.some(entry=>!entry))throw new Error('Sitemap com entradas sem URL; recolha incompleta');
    return {kind, entries:[...new Set(entries)]};
}

export async function fetchSitemapUrls(root, {source, eventUrl, fetcher=fetch, maxSitemaps=50, onError} = {}) {
    const origin = new URL(root).origin, queue=[root], visited=new Set(), events=new Set();
    while (queue.length) {
        const url=queue.shift(); if (visited.has(url)) continue;
        if (visited.size >= maxSitemaps) throw new Error(`${source}: limite de sitemaps atingido; recolha incompleta`);
        visited.add(url);
        try {
            if (visited.size > 1) await new Promise(resolve => setTimeout(resolve,250));
            const response=await fetcher(url,{headers:{'User-Agent':SOURCE_USER_AGENT},signal:AbortSignal.timeout(15000)});
            assertSourceAccess(response,source);
            if (!response.ok) throw new Error(`${source}: sitemap HTTP ${response.status}`);
            const {kind,entries}=parseSitemap(await response.text());
            for (const entry of entries) {
                let candidate;
                try {candidate=new URL(entry,url);} catch {throw new Error(`${source}: URL de sitemap inválido`);}
                if (candidate.origin !== origin || candidate.username || candidate.password) throw new Error(`${source}: sitemap fora da origem autorizada`);
                candidate.hash='';
                if (kind==='index') queue.push(candidate.href);
                else {const event=eventUrl(candidate.href); if (event) events.add(event);}
            }
        } catch(error) {
            if(url===root||error.retryable===false||!onError)throw error;
            await onError(error);
        }
    }
    return events;
}
