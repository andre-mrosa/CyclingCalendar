const cheerio = require('cheerio');

async function checkDates() {
    const formData = new URLSearchParams();
    formData.append('epoca_site2', '2026');
    formData.append('mes_de_new', '01');
    formData.append('mes_ate_new', '12');
    
    const response = await fetch(`https://www.fpciclismo.pt/calendario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    $('tr').each((i, el) => {
        const ths = $(el).find('th');
        const cols = $(el).find('td');
        if (ths.length >= 2 && cols.length >= 1) {
            let start = $(ths[0]).text().trim();
            let end = $(ths[1]).text().trim();
            const nameText = $(cols[0]).text().trim();
            if (nameText.toLowerCase().includes('volta a portugal')) {
                console.log(`Event: ${nameText} | Start: ${start} | End: ${end}`);
            }
        }
    });
}
checkDates();
