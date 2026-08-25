/**
 * Utility to parse HTML or text schedule strings into structured timeline days & activities
 */
export function parsePrograma(htmlString) {
    if (!htmlString || typeof htmlString !== 'string' || !htmlString.trim() || htmlString === 'Não disponível') {
        return null;
    }

    // FPC PDF downloads
    if (htmlString.includes('fpc-downloads')) {
        return { type: 'fpc', html: htmlString };
    }

    if (typeof window === 'undefined') {
        return { type: 'html', html: htmlString };
    }

    try {
        const parser = new DOMParser();
        const doc = parser.parseFromString(htmlString, 'text/html');
        
        const dayRegex = /(segunda|terça|terca|quarta|quinta|sexta|sábado|sabado|domingo|\d{1,2}\s+(?:de\s+)?(?:janeiro|fevereiro|março|marco|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)|\b\d{1,2}[ªº]\s*feira)/i;
        const timeRegex = /\b(\d{1,2}:\d{2}(?:\s*[-–]\s*\d{1,2}:\d{2})?)\b/;

        const days = [];

        // Check structured day wrappers (Cabreira format)
        const allCandidateDivs = Array.from(doc.querySelectorAll('body > div > div > div, body > div > div, body > div'));

        allCandidateDivs.forEach(div => {
            const children = Array.from(div.children);
            if (children.length >= 2) {
                const headerText = children[0].textContent.replace(/\s+/g, ' ').trim();
                if (dayRegex.test(headerText) && headerText.length < 70 && !timeRegex.test(headerText)) {
                    const activities = [];
                    const actContainer = children[1];
                    const actElements = Array.from(actContainer.children);

                    actElements.forEach(actEl => {
                        const actText = actEl.textContent.trim();
                        const timeMatch = actText.match(timeRegex);
                        
                        let title = actEl.querySelector('h1, h2, h3, h4, h5, h6, strong, b')?.textContent.trim() || '';
                        let desc = '';
                        actEl.querySelectorAll('p').forEach(p => {
                            const pt = p.textContent.trim();
                            if (pt !== timeMatch?.[1] && pt !== title && !pt.includes('http') && pt.length > 2) {
                                desc = pt;
                            }
                        });

                        let location = '';
                        let locationUrl = '';
                        const linkEl = actEl.querySelector('a');
                        if (linkEl) {
                            location = linkEl.textContent.trim();
                            locationUrl = linkEl.getAttribute('href') || '';
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

                    if (activities.length > 0 && !days.some(d => d.dayTitle === headerText)) {
                        days.push({
                            dayTitle: headerText,
                            activities
                        });
                    }
                }
            }
        });

        // Fallback: If no nested div wrappers found, check plain text
        if (days.length === 0) {
            const text = doc.body.textContent || '';
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
        console.error('Error parsing schedule:', err);
    }

    return { type: 'html', html: htmlString };
}
