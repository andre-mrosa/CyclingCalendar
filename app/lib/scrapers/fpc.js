import * as cheerio from 'cheerio';
import { prisma } from '../db';
import { 
    parseSortDate, getAmbito, getTag, getRegiao, 
    getDistrito, toTitleCase, getLicenca, sanitizeHtml 
} from './utils';

export const deepScrapeFPC = async (link) => {
    if (!link) return null;
    try {
        const response = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return null;
        const html = await response.text();
        const $ = cheerio.load(html);
        const table = $('table.table-striped');
        if (table.length > 0) {
            return sanitizeHtml('<table class="extracted-table">' + table.html() + '</table>');
        }
    } catch(e) {
        console.error('Error deep scraping FPC link:', link, e);
    }
    return null;
};

export const scrapeFPC = async (year) => {
    const formData = new URLSearchParams();
    formData.append('epoca_site', year);
    formData.append('mes_de_new', '01');
    formData.append('mes_ate_new', '12');

    const response = await fetch(`https://www.fpciclismo.pt/calendario`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0'
        },
        body: formData.toString()
    });

    if (!response.ok) return;

    const buffer = await response.arrayBuffer();
    const html = new TextDecoder('iso-8859-1').decode(buffer);
    const $ = cheerio.load(html);
    
    const rows = $('tr').toArray();
    for (const element of rows) {
        const ths = $(element).find('th');
        const cols = $(element).find('td');
        
        if (ths.length >= 1 && cols.length >= 3) {
            let dateText = $(ths[0]).text().trim();
            const nameText = $(cols[0]).text().trim();
            let locText = toTitleCase($(cols[1]).text().trim());
            const extraText = $(cols[2]).text().trim();
            
            if (nameText && dateText && dateText.length > 2 && !nameText.toLowerCase().includes('evento')) {
                const parts = dateText.split('-');
                const months = {'01':'JAN', '02':'FEV', '03':'MAR', '04':'ABR', '05':'MAI', '06':'JUN', '07':'JUL', '08':'AGO', '09':'SET', '10':'OUT', '11':'NOV', '12':'DEZ'};
                if (parts.length === 3) dateText = `${parts[0]} ${months[parts[1]] || parts[1]} ${parts[2]}`;

                let escaloes = [];
                const det = extraText.trim();
                const lowerName = nameText.toLowerCase();
                const codes = det.match(/\.\d{2}/g) || [];
                const uciCodes = det.match(/\b([12]\.(1|Pro|HC))\b/i);
                
                if (det.toLowerCase().includes('cpt') || lowerName.includes('aberta') || lowerName.includes('amador') || lowerName.includes('passeio') || lowerName.includes('granfondo')) escaloes.push('Todos (Aberto)');
                if (uciCodes || lowerName.includes('volta a portugal') || lowerName.includes('volta ao algarve') || lowerName.includes('volta ao alentejo')) escaloes.push('Profissional (UCI)');
                
                if (codes.includes('.12') || lowerName.includes('elite')) escaloes.push('Elite');
                if (codes.includes('.13') || lowerName.includes('sub23') || lowerName.includes('sub-23')) escaloes.push('Sub-23');
                if (codes.includes('.14') || lowerName.includes('sub19') || lowerName.includes('sub-19') || lowerName.includes('juniores')) escaloes.push('Sub-19 (Juniores)');
                if (codes.includes('.15') || lowerName.includes('sub17') || lowerName.includes('sub-17') || lowerName.includes('cadetes')) escaloes.push('Sub-17 (Cadetes)');
                if (codes.includes('.16') || lowerName.includes('sub15') || lowerName.includes('sub-15') || lowerName.includes('juvenis')) escaloes.push('Sub-15 (Juvenis)');
                if (codes.includes('.17') || lowerName.includes('master') || lowerName.includes('veteranos')) escaloes.push('Masters / Veteranos');
                if (codes.includes('.18') || lowerName.includes('feminin')) escaloes.push('Femininas');
                if (det.toLowerCase().includes('escolas') || lowerName.includes('escolas')) escaloes.push('Escolas');

                if (escaloes.length === 0) escaloes.push('Geral / Vários');
                escaloes = [...new Set(escaloes)];

                const ambitoVal = getAmbito(nameText, det);
                
                let fpcLinks = [];
                let mainLink = 'https://www.fpciclismo.pt/';
                $(element).find('a').each((i, a) => {
                    const href = $(a).attr('href') || '';
                    const onclick = $(a).attr('onclick') || '';
                    let extracted = '';
                    if (onclick.includes('pagina_ver(')) {
                        const match = onclick.match(/'([^']+)'/);
                        if (match) extracted = match[1];
                    } else if (href.startsWith('http') && !href.endsWith('fpciclismo.pt') && !href.endsWith('fpciclismo.pt/')) {
                        extracted = href;
                    }
                    if (extracted) {
                        mainLink = extracted;
                        fpcLinks.push({ label: 'Link FPC', link: extracted });
                    }
                });

                const id = 'fpc-' + nameText.replace(/\s+/g, '-').toLowerCase() + '-' + dateText.replace(/\s+/g, '-');
                
                const eventData = {
                    title: nameText,
                    date: dateText,
                    sortDate: new Date(parseSortDate(dateText, year)),
                    details: `${locText} | ${extraText}`,
                    tag: getTag(nameText, det),
                    ambito: ambitoVal,
                    escaloes: JSON.stringify(escaloes),
                    licenca: getLicenca(nameText, det, ambitoVal),
                    regiao: getRegiao(nameText, `${det} ${locText}`),
                    distrito: getDistrito(nameText, `${det} ${locText}`),
                    source: 'FPC',
                    link: mainLink,
                    extraLinks: JSON.stringify(fpcLinks)
                };

                await prisma.event.upsert({
                    where: { id: id },
                    update: eventData,
                    create: { id: id, ...eventData }
                });
            }
        }
    }
}

export const incrementalDeepScrapeFPC = async () => {
    try {
        const fpcEventsToUpdate = await prisma.event.findMany({
            where: { 
                source: 'FPC', 
                programa: null, 
                sortDate: { gte: new Date() },
                link: { contains: 'fpciclismo.pt' }
            },
            take: 5
        });
        
        for (const ev of fpcEventsToUpdate) {
            if (ev.link) {
                const programaHtml = await deepScrapeFPC(ev.link);
                await prisma.event.update({ 
                    where: { id: ev.id }, 
                    data: { programa: programaHtml || '<p>Detalhes de programa indisponíveis na página da FPC.</p>' } 
                });
            }
        }
    } catch(e) {
        console.error('Erro no incremental FPC:', e);
    }
};
