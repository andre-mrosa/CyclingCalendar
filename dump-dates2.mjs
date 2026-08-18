import * as cheerio from 'cheerio';

const parsePTDateToISO = (dateStr) => {
    if (!dateStr) return null;
    try {
        const parts = dateStr.trim().split(' ');
        const datePart = parts[0];
        const [day, month, year] = datePart.split('-');
        let timePart = "00:00:00";
        if (parts.length >= 3 && parts[1] === 'pelas') {
            timePart = parts[2].replace('h', ':') + ':00';
        }
        if (day && month && year) {
            return new Date(`${year}-${month}-${day}T${timePart}Z`);
        }
    } catch(e) { return null; }
    return null;
};

const link = 'https://cabreirasolutions.com/evento/granfondo-torres-vedras/';
const regUrl = link + '?tab=regulamento';
const res = await fetch(regUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });
const html = await res.text();
const $reg = cheerio.load(html);

let opensAt = null;
let closesAt = null;
let finalCloseDate = null;

$reg('li, p, ul, ol').each((_, el) => {
    const text = $reg(el).text();
    if (!opensAt) {
        const abertMatch = text.match(/abertura dia (\d{2}-\d{2}-\d{4}(?:\s+pelas\s+\d{2}h\d{2})?)/);
        if (abertMatch) {
            console.log('ABERTURA MATCH:', JSON.stringify(abertMatch[1]));
            const result = parsePTDateToISO(abertMatch[1]);
            console.log('parsePTDateToISO result:', result);
            opensAt = result;
        }
    }
    const encerFinal = text.match(/encerram\s+(?:o\s+)?dia\s+(\d{2}-\d{2}-\d{4}(?:\s+pelas\s+\d{2}h\d{2})?)/);
    if (encerFinal) {
        const ds = encerFinal[1].includes('pelas') ? encerFinal[1] : encerFinal[1] + ' pelas 23h59';
        console.log('ENCERRAM FINAL:', JSON.stringify(ds));
        finalCloseDate = parsePTDateToISO(ds);
    }
    if (!closesAt) {
        const encerPhase = text.match(/encerramento\s+(?:às\s+\d{2}h\d{2}\s+)?do\s+dia\s+(\d{2}-\d{2}-\d{4})/);
        if (encerPhase) {
            console.log('ENCERRAMENTO FASE:', encerPhase[1]);
            closesAt = parsePTDateToISO(encerPhase[1] + ' pelas 23h59');
        }
    }
});

if (finalCloseDate) closesAt = finalCloseDate;

console.log('\n=== RESULT ===');
console.log('opensAt:', opensAt);
console.log('closesAt:', closesAt);
