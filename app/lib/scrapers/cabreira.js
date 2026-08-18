import * as cheerio from 'cheerio';
import { prisma } from '../db';
import { 
    formatDateStr, parseSortDate, getAmbito, getTag, getRegiao, 
    getDistrito, toTitleCase, parsePTDateToISO, sanitizeHtml 
} from './utils';

export const deepScrapeCabreira = async (link) => {
    if (!link) return { opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null };
    try {
        const response = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (!response.ok) return { opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null };
        const html = await response.text();
        const $ = cheerio.load(html);
        
        let opensAt = null;
        let closesAt = null;
        let description = '';
        let prices = '';
        let insurance = '';
        let prizes = '';
        let programa = null;
        
        let descriptionHtml = '';
        
        // 1. Extrair Apresentação (Description) da aba atual (default)
        let currentSection = 'description';
        $('.event-desc').children().each((i, el) => {
            if (el.type !== 'tag') return;
            const $el = $(el);
            const tagName = (el.tagName || el.name || '').toLowerCase();
            if (!tagName) return;
            
            let isHeader = false;
            let headerText = '';
            
            if (tagName.match(/^h[1-6]$/)) {
                isHeader = true;
                headerText = $el.text().toUpperCase();
            } else if (tagName === 'ol' || tagName === 'ul') {
                const lis = $el.find('> li');
                if (lis.length === 1 && lis.find('strong').length > 0) {
                    isHeader = true;
                    headerText = lis.text().toUpperCase();
                }
            }
            
            if (isHeader) {
                if (headerText.includes('APRESENTA')) {
                    currentSection = 'description';
                } else {
                    // Outras secções na aba Apresentação ignoramos (ou não existem no novo layout)
                    currentSection = null;
                }
                return; // Ignorar o cabeçalho
            }
            
            const htmlBlock = sanitizeHtml($.html($el));
            if (!htmlBlock) return;
            
            if (currentSection === 'description') descriptionHtml += htmlBlock + '<br/><br/>';
        });

        if (descriptionHtml.length > 20) description = descriptionHtml;
        if (!description) {
            $('p').each((i, el) => {
                const txt = $(el).text().trim();
                if (txt.length > 50 && !description && !txt.toUpperCase().includes('INSCRIÇÃO') && !txt.toUpperCase().includes('REGULAMENTO')) {
                    description = txt;
                }
            });
        }

        // 2. Extrair Programa — navegar estrutura: .single-evento-programa > h2 + div(dias) > div(dia) > div(header) + div(actividades) > div(actividade)
        // Filtrar divs de actividade anormalmente grandes (> 5000 chars) que esconde regulamento
        const MAX_ACTIVITY_SIZE = 5000;
        const progContainer = $('.single-evento-programa').first();
        if (progContainer.length > 0) {
            // Reconstruir a estrutura limpando actividades com regulamento embutido
            let programaHtml = '';
            
            // Iterar filhos directos do container: <h2> e <div> wrapper de dias
            progContainer.children().each((i, topEl) => {
                const topTag = (topEl.tagName || topEl.name || '').toLowerCase();
                if (topTag === 'h2') {
                    programaHtml += $.html(topEl);
                    return;
                }
                if (topTag !== 'div') return;
                
                // Este é o wrapper com os dias
                let daysHtml = '';
                $(topEl).children().each((j, dayEl) => {
                    const dayTag = (dayEl.tagName || dayEl.name || '').toLowerCase();
                    if (dayTag !== 'div') return;
                    
                    // Cada dia tem: div(header com data) + div(lista de actividades)
                    let dayHtml = '';
                    $(dayEl).children().each((k, dayChild) => {
                        const childTag = (dayChild.tagName || dayChild.name || '').toLowerCase();
                        if (childTag !== 'div') {
                            dayHtml += $.html(dayChild);
                            return;
                        }
                        const childHtmlSize = $(dayChild).html()?.length || 0;
                        
                        // Se for a lista de actividades (grande), filtrar actividade a actividade
                        if (childHtmlSize > MAX_ACTIVITY_SIZE) {
                            let activitiesHtml = '';
                            $(dayChild).children().each((l, actEl) => {
                                const actHtmlSize = $(actEl).html()?.length || 0;
                                // Ignorar actividades com conteúdo anormalmente grande (têm regulamento dentro)
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

        // Parse phase dates da página principal (fallback)
        $('li, p').each((_, el) => {
            const text = $(el).text();
            if (text.match(/abertura/i)) {
                const abertMatch = text.match(/abertura dia (\d{2}-\d{2}-\d{4}(?:\s+pelas\s+\d{2}h\d{2})?)/);
                if (abertMatch && !opensAt) opensAt = parsePTDateToISO(abertMatch[1]);
            }
            const encerFinalMain = text.match(/encerram\s+(?:o\s+)?dia\s+(\d{2}-\d{2}-\d{4}(?:\s+pelas\s+\d{2}h\d{2})?)/);
            if (encerFinalMain) {
                const ds = encerFinalMain[1].includes('pelas') ? encerFinalMain[1] : encerFinalMain[1] + ' pelas 23h59';
                closesAt = parsePTDateToISO(ds);
            }
        });

        // 3. Fazer fetch da aba Regulamento para preços, prêmios e seguros
        let pricesHtml = '';
        let insuranceHtml = '';
        let prizesHtml = '';
        try {
            const regUrl = link + (link.includes('?') ? '&' : '?') + 'tab=regulamento';
            const regResponse = await fetch(regUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            if (regResponse.ok) {
                const regHtml = await regResponse.text();
                const $reg = cheerio.load(regHtml);
                
                let regSection = null;
                let wrapper = $reg('.wpb_text_column .wpb_wrapper').first();
                if (wrapper.length === 0) {
                    wrapper = $reg('#page-content .col-12').first();
                }
                if (wrapper.length === 0) {
                    wrapper = $reg('.event-desc').first();
                }
                
                if (wrapper.length) {
                    wrapper.children().each((i, el) => {
                        if (el.type !== 'tag') return;
                        const $el = $reg(el);
                        const text = $el.text().toUpperCase();
                        const tagName = (el.tagName || el.name || '').toLowerCase();
                        
                        let isHeader = false;
                        
                        if (tagName.match(/^h[1-6]$/)) {
                            isHeader = true;
                        } else if (tagName === 'p' && $el.find('strong').length > 0) {
                            const strongText = $el.find('strong').text().trim();
                            const fullText = $el.text().trim();
                            // Só é cabeçalho se o <p> contiver APENAS o texto bold (±3 chars extra)
                            // Evitar falsos positivos em parágrafos de conteúdo com palavras a negrito
                            if (strongText.length > 3 && fullText.length <= strongText.length + 3) {
                                isHeader = true;
                            }
                        } else if (tagName === 'ul' || tagName === 'ol') {
                            const lis = $el.find('> li');
                            const strongText = lis.find('strong').text().trim();
                            const fullText = $el.text().trim();
                            // A price phase is often a one-item list with a bold label.
                            // It is only a section header when the bold text is the whole item.
                            if (lis.length === 1 && strongText.length > 3 && fullText.length <= strongText.length + 3) {
                                isHeader = true;
                            }
                        }
                        
                        if (isHeader) {
                            if (text.match(/PRÉMIO|PREMIO|CLASSIFICA/)) {
                                regSection = 'prizes';
                            } else if (text.match(/INSCRI|PREÇO|PRECO|VALORES/)) {
                                regSection = 'prices';
                            } else if (text.match(/SEGURO/)) {
                                regSection = 'insurance';
                            } else if (text.match(/CONDI|PARTICIPA|KITS|CANCEL|ESPECIFICA|OBRIGA|PENALIZA|RECLAMA|SEGURAN|TERMO|MECAN|SAN|SECRETARIADO|FRONTAIS|ABASTECIMENTO|DOPING|CIVISMO|RESPEITO|IMAGEM|RGPD|OUTROS|CATEGORIA|CONTROLO/)) {
                                regSection = null;
                            } else if (text.match(/^[0-9]+\.\s/)) {
                                regSection = null;
                            }
                            return; 
                        }
                        
                        // Empty paragraphs are visual spacers in the source site and should not
                        // create empty areas in the event modal.
                        if (!$el.text().replace(/\u00a0/g, ' ').trim()) return;

                        const htmlBlock = sanitizeHtml($reg.html($el));
                        if (!htmlBlock) return;
                        
                        if (regSection === 'prizes') prizesHtml += htmlBlock + '<br/>';
                        else if (regSection === 'prices') pricesHtml += htmlBlock + '<br/>';
                        else if (regSection === 'insurance') insuranceHtml += htmlBlock + '<br/>';
                    });
                }
                
                // Extrair datas de inscrição do regulamento (onde normalmente vivem)
                let finalCloseDate = null;
                $reg('li, p, ul, ol').each((_, el) => {
                    const text = $reg(el).text();
                    // Data de abertura (1ª fase)
                    if (!opensAt) {
                        const abertMatch = text.match(/abertura dia (\d{2}-\d{2}-\d{4}(?:\s+pelas\s+\d{2}h\d{2})?)/);
                        if (abertMatch) opensAt = parsePTDateToISO(abertMatch[1]);
                    }
                    // Data final de fecho explícita ("inscrições encerram dia")
                    const encerFinal = text.match(/encerram\s+(?:o\s+)?dia\s+(\d{2}-\d{2}-\d{4}(?:\s+pelas\s+\d{2}h\d{2})?)/);
                    if (encerFinal) {
                        const ds = encerFinal[1].includes('pelas') ? encerFinal[1] : encerFinal[1] + ' pelas 23h59';
                        finalCloseDate = parsePTDateToISO(ds);
                    }
                    // Fallback: fecho de fase ("encerramento do dia")
                    if (!closesAt) {
                        const encerPhase = text.match(/encerramento\s+(?:às\s+\d{2}h\d{2}\s+)?do\s+dia\s+(\d{2}-\d{2}-\d{4})/);
                        if (encerPhase) closesAt = parsePTDateToISO(encerPhase[1] + ' pelas 23h59');
                    }
                });
                // Preferir a data final explícita sobre a data de fase
                if (finalCloseDate) closesAt = finalCloseDate;
            }
        } catch (err) {
            console.error('Error fetching regulamento', err);
        }

        if (prizesHtml.length > 20) prizes = prizesHtml;
        if (pricesHtml.length > 20) prices = pricesHtml;
        if (insuranceHtml.length > 20) insurance = insuranceHtml;

        return { opensAt, closesAt, description, prices, insurance, prizes, programa };
    } catch(e) {
        return { opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null };
    }
}

export const scrapeCabreira = async (year) => {
    const response = await fetch(`https://cabreirasolutions.com/eventos/`, {
        headers: { 'User-Agent': 'Mozilla/5.0' }
    });

    if (!response.ok) return;

    const html = await response.text();
    const $ = cheerio.load(html);
    const items = $('.evento-grid-item').toArray();
    
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

        let dateText = $(element).find('.evento-item-data').text().trim().toUpperCase() || 'DATA A DEFINIR';
        const rawDateForSort = dateText;
        dateText = formatDateStr(dateText, year);
        
        let locText = $(element).find('.evento-item-local').text().trim() || 'A DEFINIR';
        if (locText !== 'A DEFINIR') locText = toTitleCase(locText);
        
        if (year && dateText.includes(year)) {
            const ambitoVal = getAmbito(title);
            const id = 'cabreira-' + title.replace(/\s+/g, '-').toLowerCase() + '-' + year;
            
            // Deep Scrape
            const deepData = await deepScrapeCabreira(href);
            
            const eventData = {
                title: title,
                date: dateText,
                sortDate: new Date(parseSortDate(rawDateForSort, year)),
                details: locText,
                tag: getTag(title),
                ambito: ambitoVal,
                escaloes: JSON.stringify(['Todos (Aberto)']),
                licenca: 'CPT / Lazer',
                regiao: getRegiao(title, locText),
                distrito: getDistrito(title, locText),
                source: 'Cabreira',
                link: href || 'https://cabreirasolutions.com/eventos/',
                extraLinks: JSON.stringify(href ? [{ label: 'Ver na Cabreira Solutions', link: href }] : []),
                registrationOpensAt: deepData.opensAt,
                registrationClosesAt: deepData.closesAt,
                description: deepData.description,
                prices: deepData.prices,
                insurance: deepData.insurance,
                prizes: deepData.prizes,
                programa: deepData.programa,
            };

            await prisma.event.upsert({
                where: { id: id },
                update: eventData,
                create: { id: id, ...eventData }
            });
        }
    }
}
