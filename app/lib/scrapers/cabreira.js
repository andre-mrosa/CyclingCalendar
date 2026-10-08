import { assertMinimalCollectionEnabled } from '../contentReleasePolicy.js';
import * as cheerio from 'cheerio';
import { prisma } from '../db.js';
import {
    formatDateStr, parseSortDate, toTitleCase
} from './utils.js';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { parseRegistrationDates } from '../../utils/registrationDates.js';

const delay = ms => new Promise(res => setTimeout(res, ms));

export const deepScrapeCabreira = async (link) => {
    // We only fetch registration dates to respect minimal extraction policy (Rights Review)
    let opensAt = null, closesAt = null;
    if (!link) return { opensAt, closesAt };
    try {
        await delay(500); // Polite rate limit
        const regUrl = link + (link.includes('?') ? '&' : '?') + 'tab=regulamento';
        const regResponse = await fetch(regUrl, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(10000) });
        if (regResponse.ok) {
            const regHtml = await regResponse.text();
            const $reg = cheerio.load(regHtml);
            const dates = parseRegistrationDates($reg('body').html());
            opensAt = dates.registrationOpensAt ? new Date(dates.registrationOpensAt) : null;
            closesAt = dates.registrationClosesAt ? new Date(dates.registrationClosesAt) : null;
        }
        return { opensAt, closesAt };
    } catch(e) {
        return { opensAt: null, closesAt: null };
    }
};

export const scrapeCabreira = async (year, options = {}) => {
    assertMinimalCollectionEnabled("Cabreira");
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

        const todayZero = new Date();
        todayZero.setHours(0, 0, 0, 0);

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

            let dateText = $(element).find('.evento-item-data').text().trim().toUpperCase() || 'DATA A DEFINIR';
            const rawDateForSort = dateText;
            dateText = formatDateStr(dateText, year);

            let locText = $(element).find('.evento-item-local').text().trim() || 'A DEFINIR';
            if (locText !== 'A DEFINIR') locText = toTitleCase(locText);

            const yearInDateMatch = dateText.match(/202\d/);
            const eventYear = yearInDateMatch ? yearInDateMatch[0] : (year || new Date().getFullYear().toString());
            
            const sortDate = new Date(parseSortDate(rawDateForSort, eventYear));

            return { href, title, dateText, sortDate, locText, eventYear };
        }).filter(ev => {
            if (ev.sortDate < todayZero) return false;
            return !year || ev.dateText.includes(year);
        });

        const BATCH_SIZE = 4;
        for (let i = 0; i < rawEvents.length; i += BATCH_SIZE) {
            const chunk = rawEvents.slice(i, i + BATCH_SIZE);
            await Promise.all(chunk.map(async (ev) => {
                try {
                    const id = 'cabreira-' + ev.title.replace(/\s+/g, '-').toLowerCase() + '-' + ev.eventYear;
                    
                    const { opensAt, closesAt } = await deepScrapeCabreira(ev.href);

                    const eventData = {
                        title: ev.title,
                        date: ev.dateText,
                        sortDate: ev.sortDate,
                        details: ev.locText,
                        source: 'Cabreira',
                        link: ev.href || 'https://cabreirasolutions.com/eventos/',
                        ...(opensAt && { registrationOpensAt: opensAt }),
                        ...(closesAt && { registrationClosesAt: closesAt })
                    };

                    await saveOrMergeEvent(prisma, { id: id, ...eventData }, { ...options, verifiedSource: 'Cabreira' });
                    processedCount++;
                } catch (err) {
                    await logError('SCRAPER', `Erro ao processar prova Cabreira ${ev.title}: ${err.message}`, err);
                }
            }));
            await delay(1000); // Polite delay between batches
        }

        await logInfo('SCRAPER', `Sincronização Cabreira concluída (${processedCount} provas futuras processadas na BD)`);
        return processedCount;
    } catch (e) {
        await logError('SCRAPER', `Erro durante o scraping da Cabreira Solutions: ${e.message}`, e);
        throw e;
    }
};
