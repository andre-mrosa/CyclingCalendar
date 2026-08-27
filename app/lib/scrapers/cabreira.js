import * as cheerio from 'cheerio';
import { prisma } from '../db';
import { 
    formatDateStr, parseSortDate, getAmbito, getTag, getRegiao, 
    getDistrito, toTitleCase, parsePTDateToISO, sanitizeHtml, fetchImageAsBase64 
} from './utils';
import { logInfo, logError } from '../logger';

export const deepScrapeCabreira = async (link) => {
    if (!link) return { opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null, additionalLinks: [] };
    try {
        const response = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return { opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null, additionalLinks: [] };
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let opensAt = null;
        let closesAt = null;
        let description = '';
        let prices = '';
        let insurance = '';
        let prizes = '';
        let programa = null;
        const additionalLinks = [];
        
        // Extrair links úteis da navegação (StopAndGo, Inscrições, Lista de Inscritos, Percursos)
        $('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (!href || href === '#' || href.startsWith('javascript:')) return;
            
            if (href.includes('stopandgo.net') && href.includes('register')) {
                if (!additionalLinks.some(l => l.link === href)) {
                    additionalLinks.push({ label: 'Inscrever no StopAndGo', link: href });
                }
            } else if (href.includes('stopandgo.net') && href.includes('list')) {
                if (!additionalLinks.some(l => l.link === href)) {
                    additionalLinks.push({ label: 'Lista de Inscritos', link: href });
                }
            } else if (text.toUpperCase().includes('PERCURSO') || href.includes('tab=percursos')) {
                const fullPercursoUrl = href.startsWith('http') ? href : link + (link.includes('?') ? '&' : '?') + 'tab=percursos';
                if (!additionalLinks.some(l => l.link === fullPercursoUrl)) {
                    additionalLinks.push({ label: 'Percursos & Tracks', link: fullPercursoUrl });
                }
            } else if (text.toUpperCase().includes('REGULAMENTO') || href.includes('tab=regulamento')) {
                const fullRegUrl = href.startsWith('http') ? href : link + (link.includes('?') ? '&' : '?') + 'tab=regulamento';
                if (!additionalLinks.some(l => l.link === fullRegUrl)) {
                    additionalLinks.push({ label: 'Regulamento Oficial', link: fullRegUrl });
                }
            }
        });

        // 1. Extrair Resumo / Tabela da Barra Lateral
        let summaryHtml = '';
        const sidebar = $('.single-evento-info-sidebar');
        if (sidebar.length > 0) {
            const items = [];
            sidebar.find('.single-evento-info-sidebar-item').each((_, itemEl) => {
                const label = $(itemEl).find('.label').text().trim();
                const value = $(itemEl).find('.value').text().replace(/\s+/g, ' ').trim();
                if (label && value) {
                    items.push(`<li><strong>${label}</strong> ${value}</li>`);
                }
            });
            if (items.length > 0) {
                summaryHtml = `<div class="event-summary-card" style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.2); border-radius: 0.75rem;"><h4 style="margin: 0 0 0.5rem 0; font-weight: bold; color: #3b82f6; font-size: 0.95rem;">📋 Resumo da Prova</h4><ul style="margin: 0; padding-left: 1.25rem; line-height: 1.6; font-size: 0.875rem;">${items.join('')}</ul></div>`;
            }
        }

        // 2. Extrair Apresentação (Description)
        let descParts = [];
        $('.event-desc p, #page-content .event-desc, .wpb_text_column .wpb_wrapper p').each((_, el) => {
            const pText = $(el).text().trim();
            if (pText.length > 20 && !pText.toUpperCase().includes('COOKIES') && !pText.toUpperCase().includes('PRIVACIDADE')) {
                const cleanP = sanitizeHtml($.html(el));
                if (cleanP) descParts.push(cleanP);
            }
        });

        if (descParts.length > 0) {
            description = (summaryHtml ? summaryHtml + '<br/>' : '') + descParts.join('<br/><br/>');
        } else if (summaryHtml) {
            description = summaryHtml;
        } else {
            $('p').each((_, el) => {
                const txt = $(el).text().trim();
                if (txt.length > 50 && !description && !txt.toUpperCase().includes('INSCRIÇÃO') && !txt.toUpperCase().includes('REGULAMENTO') && !txt.toUpperCase().includes('COOKIE')) {
                    description = sanitizeHtml($.html(el));
                }
            });
        }

        // 3. Extrair Programa da Página Principal
        const MAX_ACTIVITY_SIZE = 5000;
        const progContainer = $('.single-evento-programa').first();
        if (progContainer.length > 0) {
            let programaHtml = '';
            progContainer.children().each((i, topEl) => {
                const topTag = (topEl.tagName || topEl.name || '').toLowerCase();
                if (topTag === 'h2') {
                    programaHtml += $.html(topEl);
                    return;
                }
                if (topTag !== 'div') return;
                
                let daysHtml = '';
                $(topEl).children().each((j, dayEl) => {
                    const dayTag = (dayEl.tagName || dayEl.name || '').toLowerCase();
                    if (dayTag !== 'div') return;
                    
                    let dayHtml = '';
                    $(dayEl).children().each((k, dayChild) => {
                        const childTag = (dayChild.tagName || dayChild.name || '').toLowerCase();
                        if (childTag !== 'div') {
                            dayHtml += $.html(dayChild);
                            return;
                        }
                        const childHtmlSize = $(dayChild).html()?.length || 0;
                        if (childHtmlSize > MAX_ACTIVITY_SIZE) {
                            let activitiesHtml = '';
                            $(dayChild).children().each((l, actEl) => {
                                const actHtmlSize = $(actEl).html()?.length || 0;
                                if (actHtmlSize > MAX_ACTIVITY_SIZE) return;
                                activitiesHtml += $.html(actEl);
                            });
                            dayHtml += `<div>${activitiesHtml}</div>`;
                        } else {
                            dayHtml += $.html(dayChild);
                        }
                    });
                    if (dayHtml) daysHtml += `<div>${dayHtml}</div>`;
                });
                if (daysHtml) programaHtml += `<div>${daysHtml}</div>`;
            });
            
            if (programaHtml.length > 20) {
                programa = sanitizeHtml(programaHtml);
            }
        }

        // 4. Fazer fetch da aba Percursos para detalhes dos trajectos
        try {
            const percUrl = link + (link.includes('?') ? '&' : '?') + 'tab=percursos';
            const percResponse = await fetch(percUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (percResponse.ok) {
                const percHtml = await percResponse.text();
                const $perc = cheerio.load(percHtml);
                const percItems = [];
                $perc('.single-evento-percurso-item').each((_, pEl) => {
                    const pTitle = $perc(pEl).find('.evento-percurso-item-title').text().trim();
                    const pInfo = $perc(pEl).find('.evento-percurso-item-info p').map((_, p) => $perc(p).text().trim()).get().filter(Boolean).join(' • ');
                    if (pTitle) {
                        percItems.push(`<li><strong>${pTitle}:</strong> ${pInfo}</li>`);
                    }
                });
                if (percItems.length > 0 && !summaryHtml) {
                    const percBox = `<div class="event-summary-card" style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(59,130,246,0.06); border: 1px solid rgba(59,130,246,0.2); border-radius: 0.75rem;"><h4 style="margin: 0 0 0.5rem 0; font-weight: bold; color: #3b82f6; font-size: 0.95rem;">🚴 Percursos da Prova</h4><ul style="margin: 0; padding-left: 1.25rem; line-height: 1.6; font-size: 0.875rem;">${percItems.join('')}</ul></div>`;
                    description = percBox + '<br/>' + description;
                }
            }
        } catch (err) {
            console.error('Error fetching Cabreira percursos', err);
        }

        // 5. Fazer fetch da aba Regulamento para preços, prémios, seguros e datas
        let pricesParts = [];
        let insuranceParts = [];
        let prizesParts = [];
        let scheduleParts = [];

        try {
            const regUrl = link + (link.includes('?') ? '&' : '?') + 'tab=regulamento';
            const regResponse = await fetch(regUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (regResponse.ok) {
                const regHtml = await regResponse.text();
                const $reg = cheerio.load(regHtml);
                
                // Parse phase dates do regulamento
                $reg('li, p, ul, ol, td, div').each((_, el) => {
                    const text = $reg(el).text();
                    
                    // Match abertura
                    if (!opensAt && text.match(/abertura\s+(?:dia|a)?\s*(\d{2}[-/.]\d{2}[-/.]\d{4})/i)) {
                        const m = text.match(/abertura\s+(?:dia|a)?\s*(\d{2}[-/.]\d{2}[-/.]\d{4})/i);
                        if (m) opensAt = parsePTDateToISO(m[1].replace(/\./g, '-').replace(/\//g, '-'));
                    }
                    
                    // Match fecho ("inscrições serão efetuadas até ao dia 08-09-2026" ou "encerram dia 08-09-2026")
                    if (!closesAt) {
                        const mClose = text.match(/(?:encerram|efetuadas até ao dia|até ao dia)\s+(\d{2}[-/.]\d{2}[-/.]\d{4})/i);
                        if (mClose) {
                            const cleanD = mClose[1].replace(/\./g, '-').replace(/\//g, '-');
                            closesAt = parsePTDateToISO(cleanD + ' pelas 23h59');
                        }
                    }
                });

                // Parse blocos de conteúdo do regulamento
                $reg('p, table, ul, ol').each((_, el) => {
                    const text = $reg(el).text().trim();
                    const upper = text.toUpperCase();
                    const cleanHtml = sanitizeHtml($reg.html(el));
                    if (!cleanHtml || text.length < 15) return;

                    // Inscrições / Preços
                    if (upper.includes('INSCRIÇ') || upper.includes('VALOR DE INSCRIÇÃO') || upper.includes('PREÇO') || upper.includes('TAXA') || upper.includes('€') || upper.includes('EUROS') || upper.includes('INCLUSÕES')) {
                        if (!pricesParts.includes(cleanHtml)) pricesParts.push(cleanHtml);
                    }

                    // Seguros
                    if (upper.includes('SEGURO') || upper.includes('COBERTURAS DO SEGURO') || upper.includes('MORTE POR ACIDENTE') || upper.includes('DESPESAS DE TRATAMENTO')) {
                        if (!insuranceParts.includes(cleanHtml)) insuranceParts.push(cleanHtml);
                    }

                    // Prémios
                    if (upper.includes('PRÉMIO') || upper.includes('PREMIO') || upper.includes('TROFÉU') || upper.includes('PÓDIO') || upper.includes('CLASSIFICAÇÃO')) {
                        if (!prizesParts.includes(cleanHtml)) prizesParts.push(cleanHtml);
                    }

                    // Horários / Secretariado se não tiver programa
                    if (!programa && (upper.includes('SECRETARIADO') || upper.includes('HORÁRIO PARTIDA') || upper.includes('HORÁRIOS') || upper.includes('PARTIDA/CHEGADA'))) {
                        if (!scheduleParts.includes(cleanHtml)) scheduleParts.push(cleanHtml);
                    }
                });
            }
        } catch (err) {
            console.error('Error fetching Cabreira regulamento', err);
        }

        if (pricesParts.length > 0) prices = pricesParts.join('<br/><br/>');
        if (insuranceParts.length > 0) insurance = insuranceParts.join('<br/><br/>');
        if (prizesParts.length > 0) prizes = prizesParts.join('<br/><br/>');
        if (!programa && scheduleParts.length > 0) programa = scheduleParts.join('<br/><br/>');

        return { opensAt, closesAt, description, prices, insurance, prizes, programa, additionalLinks };
    } catch(e) {
        return { opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null, additionalLinks: [] };
    }
};

export const scrapeCabreira = async (year) => {
    try {
        logInfo('SCRAPER', `Início da sincronização Cabreira Solutions (Ano: ${year || 'Todos'})`);
        const response = await fetch(`https://cabreirasolutions.com/eventos/`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) {
            logError('SCRAPER', `Falha ao aceder ao portal Cabreira Solutions (HTTP ${response.status})`);
            return;
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const items = $('.evento-grid-item').toArray();
        let processedCount = 0;
        
        for (const element of items) {
            const aTag = $(element).find('.evento-item-image-container a');
            let href = aTag.attr('href') || '';
            
            let title = 'Evento Cabreira';
            if (href) {
                const parts = href.split('/').filter(Boolean);
                const slug = parts[parts.length - 1];
                if (slug) {
                    title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
                }
            }
            
            let logoUrl = $(element).find('.evento-item-image-container .evento-item-logo').attr('src') || null;
            let imageUrl = null;
            const styleAttr = $(element).find('.evento-item-image-container .evento-item-image').attr('style');
            if (styleAttr) {
                const match = styleAttr.match(/url\(['"]?(.*?)['"]?\)/);
                if (match) imageUrl = match[1];
            }
            
            // Fetch and convert to base64
            const logo = await fetchImageAsBase64(logoUrl);
            const image = await fetchImageAsBase64(imageUrl);

            let dateText = $(element).find('.evento-item-data').text().trim().toUpperCase() || 'DATA A DEFINIR';
            const rawDateForSort = dateText;
            dateText = formatDateStr(dateText, year);
            
            let locText = $(element).find('.evento-item-local').text().trim() || 'A DEFINIR';
            if (locText !== 'A DEFINIR') locText = toTitleCase(locText);
            
            const yearInDateMatch = dateText.match(/202\d/);
            const eventYear = yearInDateMatch ? yearInDateMatch[0] : (year || new Date().getFullYear().toString());

            if (!year || dateText.includes(year)) {
                const ambitoVal = getAmbito(title);
                const id = 'cabreira-' + title.replace(/\s+/g, '-').toLowerCase() + '-' + eventYear;
                
                // Deep Scrape
                const deepData = await deepScrapeCabreira(href);
                
                let links = href ? [{ label: 'Ver na Cabreira Solutions', link: href }] : [];
                if (deepData.additionalLinks && Array.isArray(deepData.additionalLinks)) {
                    for (const addLink of deepData.additionalLinks) {
                        if (!links.some(l => l.link === addLink.link)) {
                            links.push(addLink);
                        }
                    }
                }

                const eventData = {
                    title: title,
                    date: dateText,
                    sortDate: new Date(parseSortDate(rawDateForSort, eventYear)),
                    details: locText,
                    tag: getTag(title),
                    ambito: ambitoVal,
                    escaloes: JSON.stringify(['Todos (Aberto)']),
                    licenca: 'CPT / Lazer',
                    regiao: getRegiao(title, locText),
                    distrito: getDistrito(title, locText),
                    source: 'Cabreira',
                    link: href || 'https://cabreirasolutions.com/eventos/',
                    extraLinks: JSON.stringify(links),
                    registrationOpensAt: deepData.opensAt,
                    registrationClosesAt: deepData.closesAt,
                    description: deepData.description,
                    prices: deepData.prices,
                    insurance: deepData.insurance,
                    prizes: deepData.prizes,
                    programa: deepData.programa,
                    logo: logo,
                    image: image,
                };

                await prisma.event.upsert({
                    where: { id: id },
                    update: eventData,
                    create: { id: id, ...eventData }
                });
                processedCount++;
            }
        }

        logInfo('SCRAPER', `Sincronização Cabreira concluída com sucesso (${processedCount} provas atualizadas na BD)`);
    } catch (e) {
        logError('SCRAPER', `Erro durante o scraping da Cabreira Solutions: ${e.message}`, e);
    }
};
