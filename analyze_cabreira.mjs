import fs from 'fs';
import * as cheerio from 'cheerio';

const html = fs.readFileSync('cabreira.html', 'utf8');
const $ = cheerio.load(html);

// Remove scripts and styles
$('script, style, noscript').remove();
const text = $('body').text().replace(/\s+/g, ' ');

// Match chapters in Regulamento
// Look for "PRÉMIOS E CLASSIFICAÇÕES" or similar up to the next main chapter "X. SOMETHING" (where X is a digit and no dot after it, like "8. CONDIÇÕES" instead of "8.1.")
let prizesMatch = text.match(/PRÉMIOS E CLASSIFICAÇÕES(.*?)(?=\s\d{1,2}\.\s+[A-Z])/i);
if (prizesMatch) {
    console.log("PRIZES:", prizesMatch[1].trim());
} else {
    // try fallback just "PRÉMIOS"
    prizesMatch = text.match(/PRÉMIOS\b(.*?)(?=\s\d{1,2}\.\s+[A-Z])/i);
    if (prizesMatch) console.log("PRIZES (fallback):", prizesMatch[1].trim());
}

let pricesMatch = text.match(/VALORES DE INSCRIÇÃO(.*?)(?=\s\d{1,2}\.\s+[A-Z])/i);
if (pricesMatch) {
    console.log("PRICES:", pricesMatch[1].trim());
} else {
    pricesMatch = text.match(/TAXAS DE INSCRIÇÃO(.*?)(?=\s\d{1,2}\.\s+[A-Z])/i);
    if (pricesMatch) console.log("PRICES (fallback):", pricesMatch[1].trim());
}

let insuranceMatch = text.match(/SEGURO DE ACIDENTES PESSOAIS(.*?)(?=\s\d{1,2}\.\s+[A-Z])/i);
if (insuranceMatch) {
    console.log("INSURANCE:", insuranceMatch[1].trim());
} else {
    insuranceMatch = text.match(/SEGURO\b(.*?)(?=\s\d{1,2}\.\s+[A-Z])/i);
    if (insuranceMatch) console.log("INSURANCE (fallback):", insuranceMatch[1].trim());
}
