const cheerio = require('cheerio');

async function testFPC() {
    const url = 'https://www.fpciclismo.pt/pagina/volta-a-portugal-em-bicicleta-15-prova';
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }});
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Look for Programa
    $('*').each((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text === 'programa') {
            console.log('Found Programa element:', el.tagName);
            console.log('Next sibling:', $(el).next().text().substring(0, 200));
        }
    });
}
testFPC();
