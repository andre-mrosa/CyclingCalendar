import * as cheerio from 'cheerio';
import { 
    formatDateStr, parseSortDate, getAmbito, getTag, getRegiao, 
    getDistrito, toTitleCase, parsePTDateToISO, sanitizeHtml 
} from './app/lib/scrapers/utils.js';

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

        // 2. Extrair Programa da div específica (pode estar na página default)
        const progContainer = $('.single-evento-programa').first();
        if (progContainer.length > 0) {
            programa = sanitizeHtml(progContainer.html());
        }

        // Parse phase dates da página default
        $('li, p').each((_, el) => {
            const text = $(el).text();
            if (text.includes('Fase de inscrição') && text.includes('abertura') && text.includes('encerramento')) {
                const abertMatch = text.match(/abertura dia (\d{2}-\d{2}-\d{4}(?: pelas \d{2}h\d{2})?)/);
                const encerMatch = text.match(/do dia (\d{2}-\d{2}-\d{4})/);
                
                if (abertMatch && !opensAt) opensAt = parsePTDateToISO(abertMatch[1]);
                if (encerMatch) closesAt = parsePTDateToISO(encerMatch[1] + " pelas 23h59");
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
                // Normalmente o regulamento está numa .wpb_wrapper (ou div principal)
                let wrapper = $reg('.wpb_text_column .wpb_wrapper').first();
                if (wrapper.length === 0) {
                    wrapper = $reg('#page-content .col-12').first();
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
                            const strongText = $el.find('strong').text().toUpperCase();
                            if (strongText.length > 5 && text.includes(strongText)) {
                                isHeader = true;
                            }
                        } else if (tagName === 'ul' || tagName === 'ol') {
                            const lis = $el.find('> li');
                            // Muitos regulamentos usam <ol><li><strong> para titulos
                            if (lis.length === 1 && lis.find('strong').length > 0) {
                                isHeader = true;
                            } else if (lis.length > 0 && $el.find('strong').length > 0 && text.length < 100) {
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
                            } else if (text.match(/CONDIÇÕES|PARTICIPAÇÃO|KITS|CANCELAMENTO|ESPECIFICAÇÕES|OBRIGAÇÕES|PENALIZAÇÕES|RECLAMAÇÕES/)) {
                                regSection = null;
                            } else if (text.match(/^[0-9]+\.\s/)) {
                                regSection = null;
                            }
                            console.log('>>> HEADER:', text.trim(), '-> section:', regSection);
                            return; 
                        }
                        
                        const htmlBlock = sanitizeHtml($reg.html($el));
                        if (!htmlBlock) return;
                        
                        if (regSection) {
                            console.log('ADDING [', regSection, '] ->', text.substring(0, 30));
                        }
                        
                        if (regSection === 'prizes') prizesHtml += htmlBlock + '<br/><br/>';
                        else if (regSection === 'prices') pricesHtml += htmlBlock + '<br/><br/>';
                        else if (regSection === 'insurance') insuranceHtml += htmlBlock + '<br/><br/>';
                    });
                }
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

deepScrapeCabreira('https://cabreirasolutions.com/evento/racenature-castelo-de-vide/').then(r => {});

const dump = async () => {
    const regUrl = 'https://cabreirasolutions.com/evento/racenature-castelo-de-vide/?tab=regulamento';
    const regResponse = await fetch(regUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
    const regHtml = await regResponse.text();
    const $reg = cheerio.load(regHtml);
    console.log($reg('#page-content .container').last().html().substring(0, 1500));
}
dump();




