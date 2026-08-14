const cheerio = require('cheerio');
const html = require('fs').readFileSync('cabreira-live.html', 'utf8');
const $ = cheerio.load(html);
$('h1, h2, h3, h4, h5, h6, p').each((i, el) => {
    const text = $(el).text().trim().substring(0, 80);
    if (text.length > 0) {
        console.log(el.tagName + ': ' + text);
    }
});
