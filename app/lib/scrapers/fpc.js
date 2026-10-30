import * as cheerio from 'cheerio';
import { assertMinimalCollectionEnabled } from '../contentReleasePolicy.js';
import { prisma } from '../db.js';
import { toTitleCase } from './utils.js';
import { logInfo, logError } from '../logger.js';
import { saveOrMergeEvent } from '../merging/eventMerger.js';
import { detectRaceDate } from '../../utils/detectRaceDate.js';
import { originalEventUrl } from '../publicEvent.js';
import { getEventDiscipline, getEventCategories, publishedEventCategories } from '../../utils/eventClassifier.js';
import { getAmbito } from './utils.js';
import { assertSourceAccess, SOURCE_USER_AGENT } from './sourceAccess.js';

export const fetchFPCCalendar = async (year) => {
        year = String(year);
        if (!/^\d{4}$/.test(year)) throw new Error('A época FPC inválida');

        const formData = new URLSearchParams({
            epoca_site: year, epoca_site2: year,
            mes_de_new: '01', mes_ate_new: '12',
            id_ambito_new: '', id_ambito2_new: '', classeprova_prova_new: '',
            associacao_site_new: '', organizador_site_new: '', vertente_new: ''
        });

        let html;
        for (let attempt = 0; attempt < 3; attempt++) {
            try {
                const response = await fetch('https://www.fpciclismo.pt/calendario', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': SOURCE_USER_AGENT },
                    body: formData.toString(),
                    cache: 'no-store',
                    signal: AbortSignal.timeout(20000)
                });
                assertSourceAccess(response, 'FPC');
                if (!response.ok) throw new Error(`Falha ao aceder ao calendário FPC (HTTP ${response.status})`);
                html = new TextDecoder('iso-8859-1').decode(await response.arrayBuffer());
                break;
            } catch (error) {
                if (error.retryable === false || attempt === 2) throw error;
                await new Promise(resolve => setTimeout(resolve, 500 * (attempt + 1)));
            }
        }
        return parseFPCCalendar(html, year);
};

export const parseFPCCalendar = (html, year) => {
        const $ = cheerio.load(html);
        for (const [field, expected] of Object.entries({ epoca_site: String(year), mes_de_new: '01', mes_ate_new: '12' })) {
            if ($(`select[name="${field}"]`).val() !== expected) {
                throw new Error(`A FPC não confirmou ${field}=${expected}; calendário parcial rejeitado`);
            }
        }
        if (!$('table.dc_table_s12').length) {
            const classes = $('select[name="classeprova_prova_new"]');
            const hasRaceClasses = classes.find('option').toArray().some(option => $(option).attr('value'));
            if (Number(year) > new Date().getFullYear() && classes.length && !hasRaceClasses && /<\/html>/i.test(html)) return [];
            throw new Error('Tabela do calendário FPC não encontrada');
        }

        const rows = $('table.dc_table_s12 tbody tr').toArray();
        const events = new Map();
        for (const element of rows) {
            const ths = $(element).find('th');
            const cols = $(element).find('td');
            if (ths.length >= 1 && cols.length >= 2) {
                let dateText = $(ths[0]).text().trim();
                const endDateText = ths.length > 1 ? $(ths[1]).text().trim() : '';
                const nameText = $(cols[0]).text().trim();
                let locText = toTitleCase($(cols[1]).text().trim());
                const officialClass = $(cols[2]).text().trim();
                if (nameText && /^\d{2}-\d{2}-\d{4}$/.test(dateText)) {
                    const parts = dateText.split('-');
                    if (parts[2] !== String(year)) throw new Error(`Época incorreta na linha FPC: ${dateText}`);
                    const sortDate = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T00:00:00Z`);
                    if (Number.isNaN(sortDate.getTime()) || sortDate.getUTCDate() !== Number(parts[0]) || sortDate.getUTCMonth()+1 !== Number(parts[1])) throw new Error(`Data FPC inválida: ${dateText}`);
                    const months = {'01':'JAN', '02':'FEV', '03':'MAR', '04':'ABR', '05':'MAI', '06':'JUN', '07':'JUL', '08':'AGO', '09':'SET', '10':'OUT', '11':'NOV', '12':'DEZ'};
                    if (parts.length === 3) dateText = `${parts[0]} ${months[parts[1]] || parts[1]} ${parts[2]}`;
                    if (endDateText && endDateText !== $(ths[0]).text().trim() && endDateText.length > 2) {
                        const eParts = endDateText.split('-');
                        if (eParts.length === 3) {
                            dateText = `${dateText} a ${eParts[0]} ${months[eParts[1]] || eParts[1]} ${eParts[2]}`;
                        }
                    }

                    let sourceLink = 'https://www.fpciclismo.pt/calendario';

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
                        const validLink = originalEventUrl(extracted);
                        if (validLink && sourceLink === 'https://www.fpciclismo.pt/calendario') {
                            sourceLink = validLink;
                        }
                    });

                    const id = 'fpc-' + nameText.replace(/\s+/g, '-').toLowerCase() + '-' + dateText.replace(/\s+/g, '-');

                    const eventData = {
                        title: nameText,
                        date: dateText,
                        sortDate,
                        details: locText,
                        regiao: locText,
                        distrito: locText,
                        source: 'FPC',
                        link: sourceLink,
                        tag: getEventDiscipline({ title:nameText, details:officialClass, source:'FPC' }),
                        ambito: getAmbito(nameText, officialClass, '', 'FPC'),
                        escaloes: getEventCategories({ source:'FPC', details:officialClass, escaloes:publishedEventCategories(nameText + ' ' + officialClass) }),
                        publishedCategories: getEventCategories({source:'FPC',details:officialClass,escaloes:publishedEventCategories(nameText+' '+officialClass)}),
                        ...(/\bCPT\b/i.test(officialClass) ? { licenca:'CPT / Lazer' } :
                            /^(?:[12]\.|CN\b|TP\b)/i.test(officialClass) ? { licenca:'Competição' } : {}),
                    };

                    events.set(id, { id, ...eventData });
                }
            }
        }

        return [...events.values()];
};

export const scrapeFPC = async (year, options = {}) => {
    assertMinimalCollectionEnabled("FPC");
    try {
        await logInfo('SCRAPER', `FPC ${year}: a recolher janeiro a dezembro`);
        const events = await fetchFPCCalendar(year);
        const todayZero = new Date();
        todayZero.setHours(0,0,0,0);
        let processed = 0;
        for (const event of events) {
            // ONLY PROCESS FUTURE OR ONGOING EVENTS
            const raceDates = detectRaceDate(event);
            const effectiveEnd = raceDates?.raceEndDateISO ? new Date(raceDates.raceEndDateISO + 'T23:59:59.999Z') : event.sortDate;
            if (effectiveEnd < todayZero) continue;
            await saveOrMergeEvent(prisma, event, { ...options, verifiedSource: 'FPC' });
            processed++;
        }
        await logInfo('SCRAPER', `Sincronização FPC ${year} concluída (${processed} provas futuras processadas)`);
        return processed;
    } catch (e) {
        await logError('SCRAPER', `Erro no scraping FPC ${year}: ${e.message}`, e);
        throw e;
    }
}
