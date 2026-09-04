import * as cheerio from 'cheerio';
import { prisma } from '../db.js';
import { 
    formatDateStr, parseSortDate, getAmbito, getTag, getRegiao, 
    getDistrito, toTitleCase, parsePTDateToISO, sanitizeHtml, fetchImageAsBase64 
} from './utils.js';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { downloadEventAsset } from './assetDownloader.js';

export const deepScrapeCabreira = async (link, eventId = 'cabreira-event') => {
    if (!link) return { pageTitle: null, opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null, additionalLinks: [] };
    try {
        const response = await fetch(link, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
        if (!response.ok) return { pageTitle: null, opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null, additionalLinks: [] };
        const html = await response.text();
        const $ = cheerio.load(html);

        const pageTitle = $('h1').first().text().replace(/\s+/g, ' ').trim() || null;
        
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
                    additionalLinks.push({ label: 'Página de Percursos', link: fullPercursoUrl });
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
                summaryHtml = `<div class="event-summary-card" style="margin-bottom: 1.5rem; padding: 1rem; background: rgba(54,87,214,0.06); border: 1px solid rgba(54,87,214,0.2); border-radius: 0.75rem;"><h4 style="margin: 0 0 0.5rem 0; font-weight: bold; color: #3657d6; font-size: 0.95rem;">Resumo da prova</h4><ul style="margin: 0; padding-left: 1.25rem; line-height: 1.6; font-size: 0.875rem;">${items.join('')}</ul></div>`;
            }
        }

        // 2. Extrair Apresentação (Description)
        let descParts = [];
        const seenTexts = new Set();
        $('.event-desc p, .wpb_text_column .wpb_wrapper p, #page-content p').each((_, el) => {
            const pText = $(el).text().replace(/\s+/g, ' ').trim();
            const upper = pText.toUpperCase();
            if (
                pText.length > 25 && 
                !upper.includes('COOKIES') && 
                !upper.includes('PRIVACIDADE') &&
                !upper.includes('TERMOS E CONDIÇÕES') &&
                !upper.includes('TODOS OS DIREITOS RESERVADOS') &&
                !seenTexts.has(pText)
            ) {
                seenTexts.add(pText);
                const cleanP = sanitizeHtml($.html(el));
                if (cleanP) descParts.push(cleanP);
            }
        });

        if (descParts.length > 0) {
            description = descParts.join('<br/><br/>');
        } else {
            $('p').each((_, el) => {
                const txt = $(el).text().replace(/\s+/g, ' ').trim();
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

        // 4. Fazer fetch da aba Percursos para detalhes dos trajectos, imagens de altimetria e vídeos 3D
        try {
            const percUrl = link + (link.includes('?') ? '&' : '?') + 'tab=percursos';
            const percResponse = await fetch(percUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
            if (percResponse.ok) {
                const percHtml = await percResponse.text();
                const $perc = cheerio.load(percHtml);
                const rawCourses = [];

                $perc('.single-evento-percurso-item').each((_, pEl) => {
                    const pTitle = $perc(pEl).find('.evento-percurso-item-title').text().trim();
                    const pInfo = $perc(pEl).find('.evento-percurso-item-info p').map((_, p) => $perc(p).text().trim()).get().filter(Boolean).join(' • ');
                    const pImg = $perc(pEl).find('img').attr('src');
                    const pIframe = $perc(pEl).find('iframe').attr('src');
                    if (pTitle) {
                        rawCourses.push({ pTitle, pInfo, pImg, pIframe });
                    }
                });

                for (const c of rawCourses) {
                    let localImg = null;
                    if (c.pImg) {
                        const slug = c.pTitle.toLowerCase().replace(/[^a-z0-9]/g, '_');
                        localImg = await downloadEventAsset(c.pImg, eventId, `altimetria_${slug}.png`, 'https://cabreirasolutions.com/');
                    }
                    const finalImg = localImg || c.pImg;

                    if (finalImg && !additionalLinks.some(l => l.link === finalImg)) {
                        additionalLinks.push({
                            label: `Altimetria ${c.pTitle}`,
                            link: finalImg
                        });
                    }
                    if (c.pIframe && !additionalLinks.some(l => l.link === c.pIframe)) {
                        additionalLinks.push({
                            label: `Vídeo 3D ${c.pTitle}`,
                            link: c.pIframe
                        });
                    }
                }
            }
        } catch (err) {
            console.error('Error fetching Cabreira percursos', err);
        }

        // 5. Fazer fetch da aba Regulamento para preços, prémios, seguros e datas
        try {
            const regUrl = link + (link.includes('?') ? '&' : '?') + 'tab=regulamento';
            const regResponse = await fetch(regUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(15000) });
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

                // Preços & Fases (extração limpa)
                const priceNumbers = [];
                $reg('li, p, tr').each((_, el) => {
                    const t = $reg(el).text().replace(/\s+/g, ' ').trim();
                    if (t.includes('€') && (t.includes('Federados') || t.includes('Fase') || t.includes('Inscrição') || t.includes('Valor') || t.includes('participação'))) {
                        const nums = [...t.matchAll(/(\d{1,3})\s*€/g)].map(m => parseInt(m[1])).filter(n => n >= 15 && n <= 150);
                        priceNumbers.push(...nums);
                    }
                });

                if (priceNumbers.length > 0) {
                    const minP = Math.min(...priceNumbers);
                    const maxP = Math.max(...priceNumbers);
                    prices = minP === maxP ? `${minP}€` : `Desde ${minP}€`;
                }

                // Seguros (Artigo 3: coberturas e capitais)
                const insuranceBullets = [];
                let inInsurance = false;
                $reg('p, ul, ol, h2, h3, h4').each((_, el) => {
                    const t = $reg(el).text().replace(/\s+/g, ' ').trim();
                    if (/SEGURO DE ACIDENTES PESSOAIS|COBERTURAS DO SEGURO/i.test(t)) {
                        inInsurance = true;
                        return;
                    }
                    if (inInsurance) {
                        if (/^\s*(?![3]\.)\d+\./.test(t) || /inscriç[õo]es|programa|secretariado|recursos/i.test(t)) {
                            inInsurance = false;
                            return;
                        }
                        if (t.length > 10 && (t.includes('€') || /morte|invalidez|tratamento|funeral|franquia|cobertura|sabseg/i.test(t))) {
                            const lines = t.split(/–|-|•/).map(s => s.trim()).filter(s => s.length > 5);
                            if (lines.length > 1 && t.includes('€')) {
                                lines.forEach(l => insuranceBullets.push(l));
                            } else {
                                insuranceBullets.push(t);
                            }
                        }
                    }
                });

                if (insuranceBullets.length > 0) {
                    insurance = '<ul>' + insuranceBullets.map(item => `<li>${item}</li>`).join('') + '</ul>';
                }

                // Prémios (Artigo 7 / Prémios e Classificações)
                const prizeBullets = [];
                let inPrizes = false;
                $reg('p, ul, ol, h2, h3, h4, li').each((_, el) => {
                    const t = $reg(el).text().replace(/\s+/g, ' ').trim();
                    if (/PRÉMIOS E CLASSIFICAÇÕES|PRÉMIOS|TROFÉUS/i.test(t) && /^\s*[1-9]\./.test(t)) {
                        inPrizes = true;
                        return;
                    }
                    if (inPrizes) {
                        if (/^\s*[8-9]\.\s+[A-Z]/i.test(t) || /^\s*\d{2}\.\s+[A-Z]/i.test(t) || /segurança|controlo/i.test(t)) {
                            inPrizes = false;
                            return;
                        }
                        if (t.length > 10 && /troféu|trofeu|pódio|podio|medalha|primeiro|vencedor|classificados|equipas|fair-play|boa onda/i.test(t)) {
                            if (!prizeBullets.some(p => p.includes(t.substring(0, 20)))) {
                                prizeBullets.push(t);
                            }
                        }
                    }
                });

                if (prizeBullets.length > 0) {
                    prizes = '<ul>' + prizeBullets.map(item => `<li>${item}</li>`).join('') + '</ul>';
                }
            }
        } catch (err) {
            console.error('Error fetching Cabreira regulamento', err);
        }
        if (!programa && scheduleParts.length > 0) programa = scheduleParts.join('<br/><br/>');

        return { pageTitle, opensAt, closesAt, description, prices, insurance, prizes, programa, additionalLinks };
    } catch(e) {
        return { pageTitle: null, opensAt: null, closesAt: null, description: null, prices: null, insurance: null, prizes: null, programa: null, additionalLinks: [] };
    }
};

export const scrapeCabreira = async (year, options = {}) => {
    try {
        logInfo('SCRAPER', `Início da sincronização Cabreira Solutions (Ano: ${year || 'Todos'})`);
        const response = await fetch(`https://cabreirasolutions.com/eventos/`, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (!response.ok) {
            throw new Error(`Falha ao aceder ao portal Cabreira Solutions (HTTP ${response.status})`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);
        const items = $('.evento-grid-item').toArray();
        let processedCount = 0;
        
        const rawEvents = items.map(element => {
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

            let dateText = $(element).find('.evento-item-data').text().trim().toUpperCase() || 'DATA A DEFINIR';
            const rawDateForSort = dateText;
            dateText = formatDateStr(dateText, year);
            
            let locText = $(element).find('.evento-item-local').text().trim() || 'A DEFINIR';
            if (locText !== 'A DEFINIR') locText = toTitleCase(locText);
            
            const yearInDateMatch = dateText.match(/202\d/);
            const eventYear = yearInDateMatch ? yearInDateMatch[0] : (year || new Date().getFullYear().toString());

            return { href, title, logoUrl, imageUrl, dateText, rawDateForSort, locText, eventYear };
        }).filter(ev => !year || ev.dateText.includes(year));

        // Consultar provas Cabreira já existentes na base de dados para acelerar sincronização
        const existingEvents = await prisma.event.findMany({
            where: { source: { contains: 'Cabreira' } },
            select: { id: true, logo: true, image: true, registrationClosesAt: true, prices: true, description: true, insurance: true, prizes: true, programa: true, extraLinks: true }
        });
        const existingMap = new Map(existingEvents.map(e => [e.id, e]));

        const BATCH_SIZE = 8;
        for (let i = 0; i < rawEvents.length; i += BATCH_SIZE) {
            const chunk = rawEvents.slice(i, i + BATCH_SIZE);
            await Promise.all(chunk.map(async (ev) => {
                try {
                    const id = 'cabreira-' + ev.title.replace(/\s+/g, '-').toLowerCase() + '-' + ev.eventYear;
                    const existing = existingMap.get(id);

                    let logo = existing?.logo || null;
                    let image = existing?.image || null;
                    let deepData = null;

                    // Apenas descarrega imagens se ainda não existirem na BD
                    if (!logo && ev.logoUrl) logo = await downloadEventAsset(ev.logoUrl, id, 'logo.png', 'https://cabreirasolutions.com/');
                    if (!image && ev.imageUrl) image = await downloadEventAsset(ev.imageUrl, id, 'cover.jpg', 'https://cabreirasolutions.com/');

                    if (!options.force && existing && existing.registrationClosesAt && existing.prices && existing.description && existing.description.includes('/media/events')) {
                        deepData = {
                            opensAt: existing.registrationOpensAt,
                            closesAt: existing.registrationClosesAt,
                            description: existing.description,
                            prices: existing.prices,
                            insurance: existing.insurance,
                            prizes: existing.prizes,
                            programa: existing.programa,
                            additionalLinks: []
                        };
                    } else {
                        deepData = await deepScrapeCabreira(ev.href, id);
                    }

                    const finalTitle = deepData?.pageTitle ? toTitleCase(deepData.pageTitle) : ev.title;
                    const ambitoVal = getAmbito(finalTitle);

                    let links = ev.href ? [{ label: 'Ver na Cabreira Solutions', link: ev.href }] : [];
                    if (deepData.additionalLinks && Array.isArray(deepData.additionalLinks)) {
                        for (const addLink of deepData.additionalLinks) {
                            if (!links.some(l => l.link === addLink.link)) {
                                links.push(addLink);
                            }
                        }
                    }

                    const eventData = {
                        title: finalTitle,
                        date: ev.dateText,
                        sortDate: new Date(parseSortDate(ev.rawDateForSort, ev.eventYear)),
                        details: ev.locText,
                        tag: getTag(finalTitle),
                        ambito: ambitoVal,
                        escaloes: JSON.stringify(['Todos (Aberto)']),
                        licenca: 'CPT / Lazer',
                        regiao: getRegiao(finalTitle, ev.locText),
                        distrito: getDistrito(finalTitle, ev.locText),
                        source: 'Cabreira',
                        link: ev.href || 'https://cabreirasolutions.com/eventos/',
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

                    await saveOrMergeEvent(prisma, { id: id, ...eventData }, options);
                    processedCount++;
                } catch (err) {
                    await logError('SCRAPER', `Erro ao processar prova Cabreira ${ev.title}: ${err.message}`, err);
                }
            }));
        }

        await logInfo('SCRAPER', `Sincronização Cabreira concluída (${processedCount} provas processadas na BD)`);
        return processedCount;
    } catch (e) {
        await logError('SCRAPER', `Erro durante o scraping da Cabreira Solutions: ${e.message}`, e);
        throw e;
    }
};
