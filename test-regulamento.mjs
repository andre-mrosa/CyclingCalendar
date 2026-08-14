import * as cheerio from 'cheerio';
import { sanitizeHtml } from './app/lib/scrapers/utils.js';

async function test() {
    const url = 'https://cabreirasolutions.com/evento/racenature-castelo-de-vide/?tab=regulamento';
    console.log('Fetching', url);
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    let pricesHtml = '';
    let insuranceHtml = '';
    let prizesHtml = '';
    let currentSection = null;
    
    // Encontrar os blocos de texto do regulamento
    const wrapper = $('.wpb_text_column .wpb_wrapper').first();
    if (!wrapper.length) {
        console.log("No wrapper found");
        return;
    }

    wrapper.children().each((i, el) => {
        if (el.type !== 'tag') return;
        const $el = $(el);
        const text = $el.text().toUpperCase();
        
        // Detetar headers (normalmente <p><strong>...</strong></p> ou <h2>/<h3>)
        let isHeader = false;
        const tagName = (el.tagName || el.name || '').toLowerCase();
        
        if (tagName.match(/^h[1-6]$/)) {
            isHeader = true;
        } else if (tagName === 'p' && $el.find('strong').length > 0) {
            // Verifica se o texto do strong é praticamente todo o texto do P (com margem de erro)
            const strongText = $el.find('strong').text().toUpperCase();
            if (strongText.length > 5 && text.includes(strongText)) {
                // É um titulo de seccao
                isHeader = true;
            }
        } else if (tagName === 'ul' || tagName === 'ol') {
            const lis = $el.find('> li');
            if (lis.length === 1 && lis.find('strong').length > 0) {
                isHeader = true;
            }
        }
        
        if (isHeader) {
            if (text.match(/PRÉMIO|PREMIO|CLASSIFICA/)) {
                currentSection = 'prizes';
            } else if (text.match(/INSCRI|PREÇO|PRECO|VALORES/)) {
                currentSection = 'prices';
            } else if (text.match(/SEGURO/)) {
                currentSection = 'insurance';
            } else if (text.match(/CONDIÇÕES|PARTICIPAÇÃO|KITS|CANCELAMENTO|ESPECIFICAÇÕES|OBRIGAÇÕES|PENALIZAÇÕES|RECLAMAÇÕES/)) {
                currentSection = null; // Parar de gravar
            }
            return; // Ignorar o cabeçalho em si (opcional, mas o user queria sem cabeçalho)
        }
        
        const htmlBlock = sanitizeHtml($.html($el));
        if (!htmlBlock) return;
        
        if (currentSection === 'prizes') prizesHtml += htmlBlock + '<br/><br/>';
        else if (currentSection === 'prices') pricesHtml += htmlBlock + '<br/><br/>';
        else if (currentSection === 'insurance') insuranceHtml += htmlBlock + '<br/><br/>';
    });
    
    console.log('Prices:', pricesHtml.length);
    console.log('Insurance:', insuranceHtml.length);
    console.log('Prizes:', prizesHtml.length);
    
    console.log('\n--- INSURANCE SAMPLE ---');
    console.log(insuranceHtml.substring(0, 300));
}

test().catch(console.error);
