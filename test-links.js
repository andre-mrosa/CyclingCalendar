const cheerio = require('cheerio');

async function testFPC() {
    const formData = new URLSearchParams();
    formData.append('epoca_site2', '2024');
    formData.append('mes_de_new', '01');
    formData.append('mes_ate_new', '02');
    
    const response = await fetch(`https://www.fpciclismo.pt/calendario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let count = 0;
    $('tr').each((i, el) => {
        const aTag = $(el).find('a');
        if (aTag.length > 0 && count < 5) {
            console.log('Event Link:', aTag.attr('href'), 'Text:', aTag.text().trim());
            count++;
        }
    });
    if (count === 0) console.log('No links found in tr.');
}
testFPC();
