const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('recordepessoal_sample.html', 'utf8');
const $ = cheerio.load(html);

// Find all event containers. We need to inspect the HTML structure.
const events = [];
$('a').each((i, el) => {
    const href = $(el).attr('href');
    if (href && href.includes('evento')) {
        events.push({ title: $(el).text().trim(), href });
    }
});
console.log(events);
