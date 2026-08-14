import * as cheerio from 'cheerio';
import fs from 'fs';

async function run() {
    const res = await fetch('https://cabreirasolutions.com/evento/granfondo-medio-tejo/');
    const html = await res.text();
    const $ = cheerio.load(html);
    fs.writeFileSync('medio_tejo.html', $('.event-desc').html() || '');
}
run();
