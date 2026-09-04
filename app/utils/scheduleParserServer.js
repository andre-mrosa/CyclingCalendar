import * as cheerio from 'cheerio';

/**
 * Server-side parser for event schedules (Cabreira, StopAndGo, FPC, etc.)
 * Produces the exact same structure as client-side parsePrograma to guarantee SSR hydration parity.
 */
export function parseScheduleServer(htmlString) {
    if (!htmlString || typeof htmlString !== 'string' || !htmlString.trim() || htmlString === 'Não disponível') {
        return null;
    }

    // FPC PDF downloads
    if (htmlString.includes('fpc-downloads')) {
        return { type: 'fpc', html: htmlString };
    }

    try {
        const $ = cheerio.load(htmlString);
        
        const dayRegex = /(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|\d{1,2}\s+(?:de\s+)?(?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)|\b\d{1,2}[ªº]\s*feira)/i;
        const timeRegex = /\b(\d{1,2}:\d{2}(?:\s*[-–]\s*\d{1,2}:\d{2})?)\b/;

        const days = [];

        // Check structured day wrappers (Cabreira format)
        $('body > div > div > div, body > div > div, body > div, div').each((_, div) => {
            const children = $(div).children();
            if (children.length >= 2) {
                const headerText = $(children[0]).text().replace(/\s+/g, ' ').trim();
                if (dayRegex.test(headerText) && headerText.length < 70 && !timeRegex.test(headerText)) {
                    if (days.some(d => d.dayTitle === headerText)) return;

                    const activities = [];
                    const actContainer = children[1];
                    $(actContainer).children().each((_, actEl) => {
                        const actText = $(actEl).text().trim();
                        const timeMatch = actText.match(timeRegex);
                        
                        let title = $(actEl).find('h1, h2, h3, h4, h5, h6, strong, b').first().text().trim() || '';
                        let desc = '';
                        $(actEl).find('p').each((_, p) => {
                            const pt = $(p).text().trim();
                            if (pt !== timeMatch?.[1] && pt !== title && !pt.includes('http') && pt.length > 2) {
                                desc = pt;
                            }
                        });

                        let location = '';
                        let locationUrl = '';
                        const linkEl = $(actEl).find('a').first();
                        if (linkEl.length > 0) {
                            location = linkEl.text().trim();
                            locationUrl = linkEl.attr('href') || '';
                        }

                        if (title || timeMatch) {
                            activities.push({
                                time: timeMatch ? timeMatch[1] : '',
                                title: title || 'Atividade',
                                desc: desc,
                                location: location,
                                locationUrl: locationUrl
                            });
                        }
                    });

                    if (activities.length > 0) {
                        days.push({
                            dayTitle: headerText,
                            activities
                        });
                    }
                }
            }
        });

        // Fallback: plain text lines if no nested divs
        if (days.length === 0) {
            const text = $('body').text() || $.text() || '';
            const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
            let currentDay = { dayTitle: 'Programa Oficial', activities: [] };
            let currentAct = null;

            lines.forEach(line => {
                if (dayRegex.test(line) && line.length < 60 && !timeRegex.test(line) && !line.includes('http') && !line.toLowerCase().startsWith('programa')) {
                    if (currentAct) {
                        currentDay.activities.push(currentAct);
                        currentAct = null;
                    }
                    if (currentDay.activities.length > 0) {
                        days.push(currentDay);
                    }
                    currentDay = { dayTitle: line, activities: [] };
                } else {
                    const timeMatch = line.match(timeRegex);
                    if (timeMatch && line.length < 30) {
                        if (currentAct) {
                            currentDay.activities.push(currentAct);
                        }
                        currentAct = { time: timeMatch[1], title: '', desc: '', location: '', locationUrl: '' };
                    } else if (currentAct && !currentAct.title) {
                        currentAct.title = line;
                    } else if (currentAct) {
                        if (!currentAct.desc) currentAct.desc = line;
                        else if (!currentAct.location) currentAct.location = line;
                    }
                }
            });

            if (currentAct) currentDay.activities.push(currentAct);
            if (currentDay.activities.length > 0) days.push(currentDay);
        }

        if (days.length > 0) {
            return { type: 'timeline', days };
        }
    } catch (err) {
        console.error('Error parsing schedule on server:', err);
    }

    return { type: 'html', html: htmlString };
}
