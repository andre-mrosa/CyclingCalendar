const cheerio = require('cheerio');

async function checkFPC() {
    const formData = new URLSearchParams();
    formData.append('epoca_site2', '2024'); // 2024 has lots of events with real links
    formData.append('mes_de_new', '01');
    formData.append('mes_ate_new', '12');
    
    const response = await fetch(`https://www.fpciclismo.pt/calendario`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString()
    });
    
    const html = await response.text();
    const $ = cheerio.load(html);
    
    let count = 0;
    $('tr').each((i, el) => {
        const tds = $(el).find('td');
        if (tds.length >= 4) {
            const linksHtml = $(tds[3]).html() || '';
            const linksHtml2 = $(tds[4]).html() || '';
            if (linksHtml.includes('a href') || linksHtml2.includes('a href')) {
                if (count < 3) {
                    console.log('--- Row ---');
                    console.log('Event:', $(tds[0]).text().trim());
                    console.log('TD3:', linksHtml);
                    console.log('TD4:', linksHtml2);
                    count++;
                }
            }
        }
    });
}
checkFPC();
