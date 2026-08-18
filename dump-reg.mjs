import * as cheerio from 'cheerio';
import { sanitizeHtml } from './app/lib/scrapers/utils.js';

// Usar Granfondo Torres Vedras que tem insurance=322 (cortado)
const link = 'https://cabreirasolutions.com/evento/granfondo-torres-vedras/';
const regUrl = link + '?tab=regulamento';
const res = await fetch(regUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const html = await res.text();
const $ = cheerio.load(html);

let wrapper = $('.wpb_text_column .wpb_wrapper').first();
if (wrapper.length === 0) wrapper = $('#page-content .col-12').first();
if (wrapper.length === 0) wrapper = $('.event-desc').first();

console.log('Wrapper found:', wrapper.length, 'children:', wrapper.children().length);

let inInsurance = false;
let stopReason = '';

wrapper.children().each((i, el) => {
    if (el.type !== 'tag') return;
    const $el = $(el);
    const text = $el.text().trim();
    const tagName = (el.tagName || el.name || '').toLowerCase();
    const htmlLen = ($el.html() || '').length;
    const hasStrong = $el.find('strong').length > 0;
    const strongText = $el.find('strong').text().trim();
    
    const upperText = text.toUpperCase();
    
    // Detect if we're near insurance section
    if (upperText.includes('SEGURO')) {
        inInsurance = true;
    }
    
    if (inInsurance) {
        console.log(`\n[${i}] <${tagName}> len=${htmlLen} hasStrong=${hasStrong}`);
        console.log(`  text: "${text.substring(0, 100)}"`);
        if (hasStrong) console.log(`  strong: "${strongText.substring(0, 80)}"`);
    }
    
    // Stop after 10 elements past insurance
    if (inInsurance && i > 40) return false;
});
