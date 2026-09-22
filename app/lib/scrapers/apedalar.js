import * as cheerio from 'cheerio';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';

const BASE_URL = 'https://apedalar.pt';

export async function scrapeApedalar(prisma, year, options = {}) {
    logInfo('SCRAPER', 'Início da sincronização Apedalar');
    
    try {
        const sitemapRes = await fetch(`${BASE_URL}/sitemap.xml`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        
        if (!sitemapRes.ok) throw new Error(`HTTP ${sitemapRes.status}`);
        
        const sitemapText = await sitemapRes.text();
        const urls = [];
        const regex = /<loc>(https:\/\/apedalar\.pt\/eventos\/[^<]+)<\/loc>/g;
        let match;
        while ((match = regex.exec(sitemapText)) !== null) {
            urls.push(match[1]);
        }
        
        logInfo('SCRAPER', `Encontrados ${urls.length} eventos no sitemap da Apedalar`);
        
        for (const url of urls) {
            try {
                // Throttle
                await new Promise(r => setTimeout(r, 1000));
                
                const eventRes = await fetch(url, {
                    headers: { 'User-Agent': 'Mozilla/5.0' }
                });
                
                if (!eventRes.ok) continue;
                
                const html = await eventRes.text();
                const $ = cheerio.load(html);
                
                const title = $('h1').first().text().trim();
                if (!title) continue;
                
                const rawDate = $('h2:contains("QUANDO?")').next('div').text().trim();
                if (!rawDate || !rawDate.includes(year)) continue; // Only current year
                
                const dateMatches = rawDate.match(/(\d{1,2})\s+de\s+([a-zA-Zç]+)\s+de\s+(\d{4})/i);
                if (!dateMatches) continue;
                
                const day = dateMatches[1].padStart(2, '0');
                const monthStr = dateMatches[2].toLowerCase();
                const yearStr = dateMatches[3];
                
                const monthMap = { 'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12' };
                const month = monthMap[monthStr] || '01';
                const sortDate = `${yearStr}-${month}-${day}T00:00:00Z`;
                const date = `${day} ${monthStr.charAt(0).toUpperCase() + monthStr.slice(1)} ${yearStr}`;
                
                const local = $('h2:contains("ONDE?")').next('div').text().trim().replace(/\s+/g, ' ');
                const posterRaw = $('img').toArray().find(el => $(el).attr('src') && $(el).attr('src').includes('/media/'));
                const posterUrl = posterRaw ? $(posterRaw).attr('src') : null;
                
                const registerLinkRaw = $('a:contains("Inscrever")').attr('href');
                const registrationLink = registerLinkRaw ? (registerLinkRaw.startsWith('http') ? registerLinkRaw : BASE_URL + registerLinkRaw) : url;
                
                const eventObj = {
                    id: `apedalar-${title.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${day}-${month}-${yearStr}`,
                    title,
                    date,
                    sortDate,
                    details: local,
                    tag: isCyclingEvent(title) ? getTagFromTitle(title) : 'BTT',
                    ambito: 'Regional',
                    escaloes: '["Todos (Aberto)"]',
                    licenca: 'Lazer',
                    regiao: local.split(',')[0].trim(),
                    source: 'Apedalar',
                    link: registrationLink,
                    extraLinks: JSON.stringify([{ label: 'Página Apedalar', link: url }]),
                    image: posterUrl
                };
                
                // Extrair texto de QUANTO? (preços) e REGULAMENTO (para extrair texto se houver info útil)
                const quantoText = $('h2:contains("QUANTO?")').parent().text().replace(/QUANTO\?/i, '').trim().replace(/\s+/g, ' ');
                if (quantoText) eventObj.prices = quantoText;
                
                // Prevent non-cycling events if possible (though apedalar is almost 100% cycling, they might have trails)
                if (!isCyclingEvent(title, true)) continue;
                
                await saveOrMergeEvent(prisma, eventObj, options);
                
            } catch (err) {
                logError('SCRAPER', `Erro a processar Apedalar ${url}: ${err.message}`);
            }
        }
        logInfo('SCRAPER', 'Apedalar: concluído.');
    } catch (e) {
        logError('SCRAPER', 'Falha crítica em Apedalar: ' + e.message);
    }
}

function isCyclingEvent(title, returnBool = false) {
    const t = title.toLowerCase();
    
    // Apedalar is almost entirely cycling, but let's filter out pure running trails
    if (t.includes('trail') || t.includes('caminhada') || t.includes('corrida') || t.includes('run')) {
        if (!t.includes('btt') && !t.includes('ciclismo') && !t.includes('bike')) {
            return false;
        }
    }
    
    return returnBool ? true : null;
}

function getTagFromTitle(title) {
    const t = title.toLowerCase();
    if (t.includes('estrada')) return 'Estrada';
    if (t.includes('gravel')) return 'Gravel';
    if (t.includes('enduro')) return 'Enduro';
    if (t.includes('downhill') || t.includes(' dh ')) return 'Downhill';
    if (t.includes('xco')) return 'XCO';
    if (t.includes('xcm') || t.includes('maratona')) return 'BTT XCM';
    if (t.includes('xcr') || t.includes('resistência')) return 'BTT XCR';
    if (t.includes('passeio') || t.includes('cicloturismo')) return 'Passeio';
    if (t.includes('granfondo')) return 'Granfondo';
    return 'BTT';
}
