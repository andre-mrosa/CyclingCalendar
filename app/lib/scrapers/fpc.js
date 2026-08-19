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
        
        let extractedHtml = '';

        // Extrair texto descritivo e imagens (Cartaz/Banner) usando o body inteiro
        // para garantir que não falhamos se eles criarem múltiplos contentores no site
        const containerHtml = $('body').html();
        if (containerHtml && !containerHtml.includes('Página não encontrada')) {
            const $temp = cheerio.load(containerHtml);
            $temp('#navigation, #sub_menu_sobre, footer, script, style, iframe, .navbar, .logo, .menu, .menu_lateral_items, .redes_sociais, #menu, .header, nav, header, .three__blocks, .footer, .footer_bg, #rodape, .patrocinadores, .parceiros, .cyclopnet').remove(); // remove lixo
            // Remover nós de texto diretamente na raiz (FPC copyright)
            $temp('body').contents().filter((i, el) => el.nodeType === 3).remove();
            // Extrair banner principal ou cartaz, se existir
            const bannerImg = $temp('img[src*="anexo_banner"]');
            const cartazImg = $temp('img[src*="anexo_cartaz"]');
            
            const mainImgUrl = bannerImg.length > 0 ? bannerImg.attr('src') : (cartazImg.length > 0 ? cartazImg.attr('src') : null);
            if (mainImgUrl) {
                const isCartaz = mainImgUrl.includes('anexo_cartaz');
                const maxWidth = isCartaz ? 'max-width: 400px; margin: 0 auto; display: block;' : 'width: 100%;';
                extractedHtml += `<div class="fpc-banner" style="margin-bottom: 1.5rem;"><img src="${mainImgUrl}" style="${maxWidth} border-radius: var(--radius-md); box-shadow: var(--shadow-md);" alt="Imagem do Evento" /></div>`;
            }
            $temp('img').remove(); // remover as restantes imagens para texto limpo
            
            const textContent = $temp.text().replace(/\s+/g, ' ').trim();
            if (textContent.length > 50 && !textContent.includes('Regulamentos Filiações')) {
                // Formatar links úteis que restaram na descrição
                $temp('a').each((i, el) => {
                    $temp(el).attr('target', '_blank');
                    $temp(el).attr('rel', 'noopener noreferrer');
                    $temp(el).attr('style', 'color: var(--accent-primary); text-decoration: underline; font-weight: 500;');
                });
                
                extractedHtml += `<div class="fpc-description" style="margin-bottom: 1.5rem; color: var(--text-secondary); line-height: 1.6;">${sanitizeHtml($temp.html())}</div>`;
            }
        }

        // Extrair Links (Regulamentos, PDFs, KML)
        const pdfLinks = [];
        $('a').each((i, el) => {
            let href = $(el).attr('href');
            const onclick = $(el).attr('onclick') || $(el).attr('onClick');
            
            // Tentar extrair link do onClick (comum no site da FPC para PDFs)
            if (onclick && onclick.includes('window.open')) {
                const match = onclick.match(/window\.open\s*\(\s*'([^']+)'/);
                if (match) href = match[1];
            }

            const text = $(el).text().trim() || $(el).find('input').attr('value') || 'Link Adicional';
            if (href && href !== 'javascript:void(0)' && (href.toLowerCase().endsWith('.pdf') || href.toLowerCase().endsWith('.kml') || href.toLowerCase().endsWith('.gpx') || href.includes('fpciclismo.pt/ficheiro/'))) {
                let fullLink = href;
                if (!href.startsWith('http')) {
                    fullLink = href.startsWith('/') ? `https://www.fpciclismo.pt${href}` : `https://www.fpciclismo.pt/${href}`;
                }
                // Avoid duplicates
                if (!pdfLinks.some(l => l.link === fullLink)) {
                    pdfLinks.push({ text, link: fullLink });
                }
            }
        });

        if (pdfLinks.length > 0) {
            extractedHtml += `<div class="fpc-downloads" style="margin-top: 1.5rem;">
                <h4 style="margin-bottom: 1rem; color: var(--text-primary);">Documentos e Ficheiros Disponíveis</h4>
                <div style="display: flex; flex-direction: column; gap: 0.75rem;">`;
            
            for (const doc of pdfLinks) {
                const isMap = doc.link.toLowerCase().endsWith('.kml') || doc.link.toLowerCase().endsWith('.gpx');
                const icon = isMap 
                    ? `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary);"><polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon><line x1="9" y1="3" x2="9" y2="21"></line><line x1="15" y1="3" x2="15" y2="21"></line></svg>`
                    : `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: var(--accent-primary);"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`;
                
                extractedHtml += `
                    <a href="${doc.link}" target="_blank" rel="noopener noreferrer" style="display: flex; align-items: center; gap: 0.75rem; padding: 1rem; background: var(--bg-secondary); border: 1px solid var(--card-border); border-radius: var(--radius-md); text-decoration: none; color: var(--text-primary); transition: all 0.2s ease;">
                        ${icon}
                        <span style="font-weight: 500;">${sanitizeHtml(doc.text)}</span>
                    </a>`;
            }
            extractedHtml += `</div></div>`;
        }

        const table = $('table.table-striped, table.dc_table_s20');
        if (table.length > 0) {
            extractedHtml += sanitizeHtml('<table class="extracted-table" style="margin-top: 1.5rem;">' + table.first().html() + '</table>');
        }

        if (extractedHtml.trim().length > 0) {
            return extractedHtml;
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
            const endDateText = ths.length > 1 ? $(ths[1]).text().trim() : '';
            const nameText = $(cols[0]).text().trim();
            let locText = toTitleCase($(cols[1]).text().trim());
            const extraText = $(cols[2]).text().trim();
            const organizadorText = cols.length > 3 ? $(cols[3]).text().trim() : null;
            
            if (nameText && dateText && dateText.length > 2 && !nameText.toLowerCase().includes('evento')) {
                const parts = dateText.split('-');
                const months = {'01':'JAN', '02':'FEV', '03':'MAR', '04':'ABR', '05':'MAI', '06':'JUN', '07':'JUL', '08':'AGO', '09':'SET', '10':'OUT', '11':'NOV', '12':'DEZ'};
                if (parts.length === 3) dateText = `${parts[0]} ${months[parts[1]] || parts[1]} ${parts[2]}`;
                
                if (endDateText && endDateText !== $(ths[0]).text().trim() && endDateText.length > 2) {
                    const eParts = endDateText.split('-');
                    if (eParts.length === 3) {
                        dateText = `${dateText} a ${eParts[0]} ${months[eParts[1]] || eParts[1]} ${eParts[2]}`;
                    }
                }

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
                
                const hasMasterName = lowerName.includes('master') || lowerName.includes('veterano');
                const hasYouthName = lowerName.includes('cadete') || lowerName.includes('junior') || lowerName.includes('júnior') || lowerName.includes('juvenil') || lowerName.includes('escola');
                // FPC costuma ter gralhas e meter 2.17 (Masters) em provas de Cadetes.
                if ((codes.includes('.17') && (!hasYouthName || hasMasterName)) || hasMasterName) escaloes.push('Masters / Veteranos');
                
                if (codes.includes('.18') || lowerName.includes('feminin')) escaloes.push('Femininas');
                if (det.toLowerCase().includes('escolas') || lowerName.includes('escolas')) escaloes.push('Escolas');

                if (escaloes.length === 0) escaloes.push('Geral / Vários');
                escaloes = [...new Set(escaloes)];

                const ambitoVal = getAmbito(nameText, det);
                
                let fpcLinks = [];
                let mainLink = 'https://www.fpciclismo.pt/';
                let hasProvaInscrever = false;

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
                        fpcLinks.push({ label: 'Link FPC', link: extracted });
                        if (extracted.includes('prova-inscrever')) {
                            mainLink = extracted;
                            hasProvaInscrever = true;
                        } else if (!hasProvaInscrever) {
                            mainLink = extracted;
                        }
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
                    extraLinks: JSON.stringify(fpcLinks),
                    organizador: organizadorText || null
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
