import * as cheerio from 'cheerio';
import fs from 'fs';

async function run() {
    const res = await fetch('https://cabreirasolutions.com/evento/vila-do-conde-peneda-geres-extreme/');
    const html = await res.text();
    const $ = cheerio.load(html);
    fs.writeFileSync('vila_do_conde.html', $('.event-desc').html() || '');
}
run();
