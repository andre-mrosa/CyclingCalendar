import * as cheerio from 'cheerio';
import { prisma } from '../db.js';
import { 
    getAmbito, getTag, getRegiao, getDistrito, 
    toTitleCase, sanitizeHtml 
} from './utils.js';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';

const MONTH_MAP = {
    'jan': '01', 'fev': '02', 'mar': '03', 'abr': '04',
    'mai': '05', 'jun': '06', 'jul': '07', 'ago': '08',
    'set': '09', 'out': '10', 'nov': '11', 'dez': '12',
    'janeiro': '01', 'fevereiro': '02', 'março': '03', 'marco': '03',
    'abril': '04', 'maio': '05', 'junho': '06', 'julho': '07',
    'agosto': '08', 'setembro': '09', 'outubro': '10', 'novembro': '11', 'dezembro': '12'
};

const MONTH_ABBR = {
    '01': 'JAN', '02': 'FEV', '03': 'MAR', '04': 'ABR',
    '05': 'MAI', '06': 'JUN', '07': 'JUL', '08': 'AGO',
    '09': 'SET', '10': 'OUT', '11': 'NOV', '12': 'DEZ'
};

/**
 * Normaliza datas da Classificações.net para formato padrão e sortDate
 */
export function parseClassificacoesDate(rawDateStr, fallbackYear = new Date().getFullYear().toString()) {
    if (!rawDateStr) return { dateText: 'DATA A DEFINIR', sortDate: new Date(), year: fallbackYear };
    let clean = rawDateStr.replace(/Data da Prova\s*:\s*/i, '').replace(/\s+/g, ' ').trim();
    const yearMatch = clean.match(/202\d/);
    const year = yearMatch ? yearMatch[0] : fallbackYear;

    // Range: "01 Mai 2026 a 03 Mai 2026" or "01 Mai a 03 Mai 2026" or "01 a 03 Mai 2026"
    const multiMatch = clean.match(/(\d{1,2})\s+([a-zçã]+)\s*(?:202\d)?\s*(?:a|-)\s*(\d{1,2})\s+([a-zçã]+)\s*(?:202\d)?/i);
    if (multiMatch) {
        const startDay = multiMatch[1].padStart(2, '0');
        const startMonthName = multiMatch[2].toLowerCase().slice(0, 3);
        const endDay = multiMatch[3].padStart(2, '0');
        const endMonthName = multiMatch[4].toLowerCase().slice(0, 3);

        const startMonthNum = MONTH_MAP[startMonthName] || '01';
        const endMonthNum = MONTH_MAP[endMonthName] || '01';
        const startAbbr = MONTH_ABBR[startMonthNum] || 'JAN';
        const endAbbr = MONTH_ABBR[endMonthNum] || 'JAN';

        const sortDate = new Date(`${year}-${startMonthNum}-${startDay}T08:00:00Z`);
        
        // Se for o mesmo dia
        if (startDay === endDay && startAbbr === endAbbr) {
            return { dateText: `${startDay} ${startAbbr} ${year}`, sortDate, year };
        }
        
        const dateText = `${startDay} ${startAbbr} a ${endDay} ${endAbbr} ${year}`;
        return { dateText, sortDate, year };
    }

    // Single date: "15 Mai 2026" or "15 de Maio de 2026"
    const singleMatch = clean.match(/(\d{1,2})\s+(?:de\s+)?([a-zçã]+)(?:\s+de)?\s*(202\d)?/i);
    if (singleMatch) {
        const day = singleMatch[1].padStart(2, '0');
        const mKey = singleMatch[2].toLowerCase().slice(0, 3);
        const monthNum = MONTH_MAP[mKey] || '01';
        const monthAbbr = MONTH_ABBR[monthNum] || 'JAN';
        const sortDate = new Date(`${year}-${monthNum}-${day}T08:00:00Z`);
        const dateText = `${day} ${monthAbbr} ${year}`;
        return { dateText, sortDate, year };
    }

    return { dateText: clean.toUpperCase(), sortDate: new Date(), year };
}

/**
 * Scrape de uma página individual da Classificações.net
 */
async function scrapeClassificacoesPage(url, retries = 2) {
    try {
        let res = null;
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                res = await fetch(url, { 
                    headers: { 'User-Agent': 'Mozilla/5.0' }, 
                    signal: AbortSignal.timeout(6000) 
                });
                if (res.ok) break;
            } catch (err) {
                if (attempt === retries) return null;
                await new Promise(r => setTimeout(r, 400 * (attempt + 1)));
            }
        }
        if (!res || !res.ok) return null;
        const html = await res.text();
        const $ = cheerio.load(html);

        // Extrair Título limpo
        let title = '';
        const rawBc = $('.breadcrumb, .breadcrumbs').text().replace(/\s+/g, ' ').trim();
        if (rawBc) {
            const match = rawBc.match(/(?:Ciclismo|BTT|Modalidades)\s*(?:>|»)?\s*(.*?)(?:Voltar|$)/i);
            if (match && match[1]?.trim()) title = match[1].trim();
        }
        if (!title) {
            title = $('h1, h2.title, .event-title').first().text().replace(/\s+/g, ' ').trim();
        }
        if (!title) {
            const slug = url.split('/').filter(Boolean).pop() || '';
            title = slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
        }
        if (!title) return null;

        // Extrair Data
        let rawDate = '';
        $('p, span, div, td, th').each((_, el) => {
            const t = $(el).text().replace(/\s+/g, ' ').trim();
            if (t.startsWith('Data da Prova:') || (/\d{1,2}\s+[a-zçã]+\s+202\d/i.test(t) && t.length < 50 && !rawDate)) {
                rawDate = t;
            }
        });

        const slug = url.split('/').filter(Boolean).pop() || '';
        const slugYearMatch = slug.match(/202\d/);
        const fallbackYear = slugYearMatch ? slugYearMatch[0] : new Date().getFullYear().toString();

        const parsedDate = parseClassificacoesDate(rawDate, fallbackYear);
        const dateText = parsedDate.dateText;
        const sortDate = parsedDate.sortDate;

        // Extrair Localização
        let location = 'Portugal';
        const pageText = $('body').text().replace(/\s+/g, ' ').trim();
        const locMatch = pageText.match(/Localidade\s*:\s*([A-ZÀ-Úa-zà-ú\s]+)/i) || pageText.match(/([A-ZÀ-Úa-zà-ú\s]+),\s*Portugal/);
        if (locMatch) location = toTitleCase(locMatch[1].trim());

        // Extrair Downloads (PDFs de Classificações, Etapas, Geral)
        const extraLinks = [{ label: 'Página Classificações.net', link: url }];

        $('a[href*="/download/"], a[href*="/print/"], a[href*=".pdf"]').each((_, el) => {
            const href = $(el).attr('href');
            let label = $(el).text().replace(/\s+/g, ' ').trim() || $(el).attr('title') || 'Classificação Oficial';
            if (label.length > 50) label = 'Classificação Oficial';
            if (href) {
                const fullUrl = href.startsWith('http') ? href : 'https://www.classificacoes.net' + href;
                if (!extraLinks.some(d => d.link === fullUrl)) {
                    extraLinks.push({ label, link: fullUrl });
                }
            }
        });

        // Construir programa / secção de classificações
        let programaHtml = '';
        if (extraLinks.length > 0) {
            programaHtml += '<div style="margin-top: 1rem;"><p><strong>Resultados e Classificações Oficiais:</strong></p><ul style="padding-left: 1.25rem;">';
            for (const item of extraLinks) {
                programaHtml += `<li><a href="${item.link}" target="_blank" rel="noopener noreferrer" style="color: #f59e0b; text-decoration: underline; font-weight: 500;">${sanitizeHtml(item.label)}</a></li>`;
            }
            programaHtml += '</ul></div>';
        }

        const cleanTitle = toTitleCase(title.replace(/^(BTT|Ciclismo|Gravel|Estrada)\s+/i, '').trim());
        const tag = getTag(cleanTitle, location + ' ' + pageText);
        const regiao = getRegiao(cleanTitle, location);
        const distrito = getDistrito(cleanTitle, location);
        const ambito = getAmbito(cleanTitle, pageText);

        const id = 'classif_' + slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);

        return {
            id,
            title: cleanTitle,
            date: dateText,
            sortDate,
            details: location,
            regiao,
            distrito,
            tag,
            ambito,
            licenca: 'Competição',
            source: 'Classificações.net',
            link: url,
            image: null,
            logo: null,
            programa: programaHtml || null,
            extraLinks: JSON.stringify(extraLinks),
            escaloes: JSON.stringify(['Todos (Aberto)']),
            prices: null
        };
    } catch (e) {
        return null;
    }
}

/**
 * Scraper Universal Classificações.net
 * Consulta o sitemap e extrai provas de Ciclismo e BTT
 */
export async function scrapeClassificacoes(options = {}) {
    try {
        logInfo('SCRAPER', 'Início da sincronização Classificações.net (sitemap.xml)');

        const res = await fetch('https://classificacoes.net/sitemap.xml', {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            signal: AbortSignal.timeout(8000)
        });

        if (!res.ok) {
            logError('SCRAPER', `Falha ao aceder ao sitemap Classificações.net (HTTP ${res.status})`);
            return 0;
        }

        const xml = await res.text();
        const locs = (xml.match(/<loc>(.*?)<\/loc>/g) || []).map(l => l.replace(/<\/?loc>/g, ''));

        const cyclingUrls = locs.filter(l => l.includes('/modalidades/ciclismo/') || l.includes('/modalidades/btt/'));

        const currentYear = new Date().getFullYear();
        const years = options.years || [currentYear.toString(), (currentYear + 1).toString(), (currentYear - 1).toString()];

        // Filtrar provas dos anos alvo ou sem ano explícito no slug
        const targetUrls = cyclingUrls.filter(u => {
            const lower = u.toLowerCase();
            const hasYear = years.some(yr => lower.includes(yr));
            const hasNoYearInSlug = !lower.match(/202\d/);
            return hasYear || (hasNoYearInSlug && !options.yearsOnly) || options.fullHistorical;
        });

        const existingEvents = await prisma.event.findMany({
            where: { source: { contains: 'Classificações' } },
            select: { id: true, date: true, details: true }
        });
        const existingMap = new Map(existingEvents.map(e => [e.id, e]));

        const urlsToScrape = [];
        let alreadySyncedCount = 0;

        for (const u of targetUrls) {
            const slug = u.split('/').filter(Boolean).pop() || '';
            const id = 'classif_' + slug.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32);
            const existing = existingMap.get(id);

            if (existing && existing.date && !existing.date.includes('DEFINIR') && !options.forceAll) {
                alreadySyncedCount++;
            } else {
                urlsToScrape.push(u);
            }
        }

        logInfo('SCRAPER', `Classificações.net: ${targetUrls.length} provas (${alreadySyncedCount} já sincronizadas, ${urlsToScrape.length} a processar/atualizar)...`);

        let savedOrMergedCount = alreadySyncedCount;
        const BATCH_SIZE = 8;
        for (let i = 0; i < urlsToScrape.length; i += BATCH_SIZE) {
            const chunk = urlsToScrape.slice(i, i + BATCH_SIZE);
            const events = await Promise.all(chunk.map(url => scrapeClassificacoesPage(url)));
            for (const ev of events) {
                if (ev) {
                    await saveOrMergeEvent(prisma, ev);
                    savedOrMergedCount++;
                }
            }
        }

        logInfo('SCRAPER', `Classificações.net: ${savedOrMergedCount} provas de ciclismo processadas e fundidas com sucesso.`);
        return savedOrMergedCount;

    } catch (e) {
        logError('SCRAPER', `Erro global no scraper Classificações.net: ${e.message}`, e);
        return 0;
    }
}
