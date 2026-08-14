import * as cheerio from 'cheerio';
import { sanitizeHtml } from './app/lib/scrapers/utils.js';

async function test() {
    console.log('Fetching...');
    const url = 'https://cabreirasolutions.com/evento/granfondo-leiria-region/';
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    let descriptionHtml = '';
    let pricesHtml = '';
    let insuranceHtml = '';
    let prizesHtml = '';
    let programaHtml = '';

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
            } else if (headerText.match(/PRÉMIO|PREMIO|CLASSIFICA/)) {
                currentSection = 'prizes';
            } else if (headerText.match(/INSCRI|PREÇO|PRECO/)) {
                currentSection = 'prices';
            } else if (headerText.match(/SEGURO/)) {
                currentSection = 'insurance';
            } else if (headerText.match(/PROGRAMA/)) {
                currentSection = 'programa';
            } else if (headerText.match(/PROVA|PARTICIPA|CANCEL|CONDI|SEGURAN|TERMO|MECAN|SAN|SECRETARIADO|FRONTAIS|ABASTECIMENTO|DOPING|CIVISMO|RESPEITO|IMAGEM|RGPD|OUTROS/)) {
                currentSection = null; // Parar de gravar
            }
            return; // Ignorar o cabeçalho em si
        }
        
        const htmlBlock = sanitizeHtml($.html($el));
        if (!htmlBlock) return;
        
        if (currentSection === 'description') descriptionHtml += htmlBlock + '<br/><br/>';
        else if (currentSection === 'prizes') prizesHtml += htmlBlock + '<br/><br/>';
        else if (currentSection === 'prices') pricesHtml += htmlBlock + '<br/><br/>';
        else if (currentSection === 'insurance') insuranceHtml += htmlBlock + '<br/><br/>';
        else if (currentSection === 'programa') programaHtml += htmlBlock + '<br/><br/>';
    });

    console.log('Description:', descriptionHtml.length);
    console.log('Prizes:', prizesHtml.length);
    console.log('Prices:', pricesHtml.length);
    console.log('Insurance:', insuranceHtml.length);
    console.log('Programa:', programaHtml.length);
}

test().catch(console.error);
