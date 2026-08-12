const cheerio = require('cheerio');

async function checkFPC() {
    const formData = new URLSearchParams();
    formData.append('epoca_site2', '2024'); 
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
            let fpcLinks = [];
            $(el).find('a').each((i, a) => {
                const href = $(a).attr('href') || '';
                const onclick = $(a).attr('onclick') || '';
                const title = $(a).attr('title') || $(a).find('img').attr('title') || $(a).find('img').attr('alt') || '';
                let extracted = '';
                
                if (onclick.includes('pagina_ver(')) {
                    const match = onclick.match(/'([^']+)'/);
                    if (match) extracted = match[1];
                } else if (href.startsWith('http') && !href.endsWith('fpciclismo.pt') && !href.endsWith('fpciclismo.pt/')) {
                    extracted = href;
                }
                
                if (extracted && !fpcLinks.some(l => l.link === extracted)) {
                    let label = 'Mais Info (FPC)';
                    if (title.toLowerCase().includes('inscrever') || extracted.includes('inscrever')) label = 'Inscrever (FPC)';
                    else if (title.toLowerCase().includes('classifica') || extracted.includes('classifica')) label = 'Resultados (FPC)';
                    else if (title.toLowerCase().includes('site') || title.toLowerCase().includes('página')) label = 'Website Oficial';
                    else if (title) label = `${title} (FPC)`;
                    
                    fpcLinks.push({ label, link: extracted });
                }
            });
            
            if (fpcLinks.length > 0) {
                if (count < 3) {
                    console.log('Event:', $(tds[0]).text().trim());
                    console.log('Links extracted:', fpcLinks);
                    count++;
                }
            }
        }
    });
}
checkFPC();
