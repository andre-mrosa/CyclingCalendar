const https = require('https');
const cheerio = require('cheerio');

async function fetchHtml(url) {
    const formData = new URLSearchParams();
    formData.append('epoca_site2', '2024');
    formData.append('mes_de_new', '01');
    formData.append('mes_ate_new', '12');

    return new Promise((resolve, reject) => {
        const options = {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        };
        const req = https.request(url, options, (res) => {
            let data = [];
            res.on('data', chunk => data.push(chunk));
            res.on('end', () => resolve(Buffer.concat(data)));
        });
        req.on('error', reject);
        req.write(formData.toString());
        req.end();
    });
}

async function run() {
    try {
        const buffer = await fetchHtml('https://www.fpciclismo.pt/calendario');
        let html = new TextDecoder('utf-8').decode(buffer);
        if (html.includes('\uFFFD')) {
            html = new TextDecoder('iso-8859-1').decode(buffer);
        }
        
        const $ = cheerio.load(html);
        let found = 0;
        
        $('tr').each((index, element) => {
            const ths = $(element).find('th');
            const cols = $(element).find('td');
            if (ths.length >= 1 && cols.length >= 3) {
                const nameText = $(cols[0]).text().trim();
                const locText = $(cols[1]).text().trim();
                const extraText = $(cols[2]).text().trim();
                
                const fullText = (nameText + ' ' + locText + ' ' + extraText).toLowerCase();
                
                // Let's just look for anything remotely resembling santarem or its cities (e.g. cartaxo, almeirim, abrantes, coruche, fatima)
                if (fullText.includes('santarém') || fullText.includes('santarem') || fullText.includes('cartaxo') || fullText.includes('almeirim') || fullText.includes('abrantes') || fullText.includes('coruche') || fullText.includes('fátima') || fullText.includes('fatima') || fullText.includes('leiria') || fullText.includes('acs')) {
                    console.log(`[MATCH] ${nameText} | ${locText} | ${extraText}`);
                    found++;
                }
            }
        });
        console.log(`Found ${found} potential Santarem events.`);
    } catch(e) {
        console.error(e);
    }
}
run();
