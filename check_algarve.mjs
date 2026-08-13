import { fetch } from 'undici';
import * as cheerio from 'cheerio';

const fetchFPC = async (year) => {
    const formData = new URLSearchParams();
    formData.append('epoca_site', year);
    formData.append('mes_de_new', '01');
    formData.append('mes_ate_new', '12');

    const response = await fetch(`https://www.fpciclismo.pt/calendario`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        },
        body: formData.toString()
    });

    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('utf-8');
    let html = decoder.decode(buffer);
    
    if (html.includes('\uFFFD')) {
        const isoDecoder = new TextDecoder('iso-8859-1');
        html = isoDecoder.decode(buffer);
    }
    
    const $ = cheerio.load(html);
    const events = [];
    
    $('tr').each((index, element) => {
        const cols = $(element).find('td');
        if (cols.length >= 3) {
            const nameText = $(cols[0]).text().trim();
            if (nameText.toLowerCase().includes('algarve')) {
                events.push(nameText);
            }
        }
    });
    console.log("Algarve matches:", events);
};

fetchFPC('2024');
