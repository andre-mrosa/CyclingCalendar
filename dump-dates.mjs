import * as cheerio from 'cheerio';

// Torres Vedras has prices=2060 but no registration dates in DB
const link = 'https://cabreirasolutions.com/evento/granfondo-torres-vedras/';
const regUrl = link + '?tab=regulamento';
const res = await fetch(regUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const html = await res.text();
const $ = cheerio.load(html);

let wrapper = $('.wpb_text_column .wpb_wrapper').first();
if (wrapper.length === 0) wrapper = $('#page-content .col-12').first();
if (wrapper.length === 0) wrapper = $('.event-desc').first();

console.log('=== Date patterns in regulamento ===\n');
wrapper.find('li, p, ul, ol').each((i, el) => {
    const text = $(el).text().trim();
    if (text.match(/abertura|encerram|encerramento|inscrições\s+encerram/i)) {
        console.log(`[${i}] text: "${text.substring(0, 200)}"`);
        
        // Test regex patterns
        const abertMatch = text.match(/abertura dia (\d{2}-\d{2}-\d{4}(?:\s+pelas\s+\d{2}h\d{2})?)/i);
        if (abertMatch) console.log(`  -> OPENS: "${abertMatch[1]}"`);
        
        const encerFinal = text.match(/encerram\s+(?:o\s+)?dia\s+(\d{2}-\d{2}-\d{4}(?:\s+pelas\s+\d{2}h\d{2})?)/i);
        if (encerFinal) console.log(`  -> CLOSES FINAL: "${encerFinal[1]}"`);

        const encerPhase = text.match(/encerramento\s+(?:às\s+\d{2}h\d{2}\s+)?do\s+dia\s+(\d{2}-\d{2}-\d{4})/i);
        if (encerPhase) console.log(`  -> CLOSES PHASE: "${encerPhase[1]}"`);
        
        console.log('');
    }
});
