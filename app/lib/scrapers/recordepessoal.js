import * as cheerio from 'cheerio';
import { logInfo, logError } from '../logger.js';
import { getTag } from './utils.js';
import { prisma } from '../db.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';

const BASE_URL = 'https://www.recordepessoal.pt';

export async function scrapeRecordePessoal(options = {}) {
    const { years = [new Date().getFullYear().toString()] } = options;
    const allEvents = [];
    
    logInfo('SCRAPER', 'Início da sincronização Recorde Pessoal');
    
    try {
        const categories = ['btt', 'ciclismo-de-estrada'];
        const eventLinks = new Set();
        
        for (const cat of categories) {
            const res = await fetch(`${BASE_URL}/eventos?cat=${cat}&pagina=-1`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            
            if (!res.ok) {
                logError('SCRAPER', `Falha ao aceder à categoria ${cat} (HTTP ${res.status})`);
                continue;
            }
            
            const html = await res.text();
            const $ = cheerio.load(html);
            
            $('.evento').each((i, el) => {
                const title = $(el).find('.titulo').first().text().trim();
                const rawLink = $(el).attr('data-evento');
                if (rawLink && isCyclingEvent(title, cat)) {
                    const cleanLink = rawLink.replace(/"/g, '');
                    eventLinks.add(BASE_URL + cleanLink);
                }
            });
        }
        
        const eventLinksArray = Array.from(eventLinks);
        logInfo('SCRAPER', `Encontrados ${eventLinksArray.length} eventos de Ciclismo na Recorde Pessoal`);
        
        for (const link of eventLinksArray) {
            try {
                // Throttle
                await new Promise(r => setTimeout(r, 1000));
                
                const pageRes = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
                if (!pageRes.ok) continue;
                
                const pageHtml = await pageRes.text();
                const $p = cheerio.load(pageHtml);
                
                const title = $p('.eventoTitulo .titulosPaginasBold').text().trim();
                const local = $p('.localEvento div').eq(1).text().trim();
                const dataRaw = $p('.dataEvento div').eq(1).text().trim(); // ex: 11 Outubro 2026
                const posterUrl = $p('.cartazEvento').attr('href');
                const logo = posterUrl ? BASE_URL + posterUrl : null;
                const registrationLink = $p('a.inscreverEvento').attr('href');
                
                // Conversão de data PT
                let cleanDate = dataRaw;
                const match = dataRaw.match(/(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})/);
                let sortDateStr = dataRaw;
                if (match) {
                    const months = { 'janeiro': '01', 'fevereiro': '02', 'março': '03', 'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07', 'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12' };
                    let m = match[2].toLowerCase();
                    if (months[m]) {
                         cleanDate = `${match[1].padStart(2, '0')} ${m.substring(0,3).toUpperCase()} ${match[3]}`;
                         sortDateStr = `${match[3]}-${months[m]}-${match[1].padStart(2, '0')}T00:00:00.000Z`;
                    }
                }
                
                if (!title || !sortDateStr.includes('T00:00:00')) continue;
                
                const eventObj = {
                    id: `recordepessoal-${link.split('/').pop()}-${cleanDate.replace(/ /g, '-')}`.toLowerCase(),
                    title,
                    date: cleanDate,
                    sortDate: sortDateStr,
                    details: local,
                    tag: getTag(title),
                    ambito: 'Regional',
                    escaloes: JSON.stringify(['Todos (Aberto)']),
                    licenca: 'Lazer',
                    regiao: local,
                    distrito: '',
                    source: 'Recorde Pessoal',
                    link: registrationLink ? (registrationLink.startsWith('http') ? registrationLink : BASE_URL + registrationLink) : link,
                    image: logo
                };
                
                if (years.includes(new Date(sortDateStr).getFullYear().toString())) {
                    await saveOrMergeEvent(prisma, eventObj, options);
                    allEvents.push(eventObj);
                }
                
            } catch(e) {
                logError('SCRAPER', `Erro a processar prova Recorde Pessoal (${link}): ${e.message}`);
            }
        }
        
        return allEvents.length;
        
    } catch (e) {
        logError('SCRAPER', `Falha ao sincronizar Recorde Pessoal: ${e.message}`);
        throw e;
    }
}

function isCyclingEvent(title, cat) {
    const t = title.toLowerCase();
    
    // Se o site diz que é ciclismo de estrada, e não diz explicitamente trail/corrida no titulo, aceitamos
    if (cat === 'ciclismo-de-estrada' && !t.includes('trail') && !t.includes('corrida')) {
        return true;
    }

    if (t.includes('trail') || t.includes('maratona') || t.includes('silvestre') || t.includes('caminhada') || t.includes('corrida') || t.includes('run')) {
        if (!t.includes('btt') && !t.includes('ciclismo')) {
            return false;
        }
    }
    
    const keywords = ['btt', 'ciclismo', 'raid', 'passeio', 'gravel', 'granfondo', 'cicloturismo', 'resistência', 'xco', 'xcm', 'xcr', 'downhill', 'enduro', 'bike', 'ciclocrosse'];
    return keywords.some(k => t.includes(k));
}
