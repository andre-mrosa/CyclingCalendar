import * as cheerio from 'cheerio';

const url = 'https://cabreirasolutions.com/evento/granfondo-medio-tejo-2/';
const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const html = await res.text();
const $ = cheerio.load(html);

const prog = $('.single-evento-programa').first();
const wrapper = prog.children().eq(1); // The main div with days
console.log('Wrapper children:', wrapper.children().length);

wrapper.children().each((i, dayEl) => {
    const dayTag = (dayEl.tagName || dayEl.name || '').toLowerCase();
    console.log(`\n=== Day [${i}] <${dayTag}> ===`);
    $(dayEl).children().each((j, child) => {
        const ctag = (child.tagName || child.name || '').toLowerCase();
        const ctext = $(child).text().trim().substring(0, 80);
        const clen = $(child).html()?.length || 0;
        console.log(`  [${j}] <${ctag}> len=${clen} -> "${ctext}"`);
        
        // Go one level deeper
        $(child).children().each((k, grandchild) => {
            const gtag = (grandchild.tagName || grandchild.name || '').toLowerCase();
            const gtext = $(grandchild).text().trim().substring(0, 60);
            const glen = $(grandchild).html()?.length || 0;
            console.log(`    [${k}] <${gtag}> len=${glen} -> "${gtext}"`);
        });
    });
});
