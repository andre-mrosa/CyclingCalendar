const cheerio = require('cheerio');
fetch('https://cabreirasolutions.com/eventos/')
.then(r => r.text())
.then(html => {
    const $ = cheerio.load(html);
    const link = $('.evento-item-image-container a').first().attr('href');
    console.log('First event link:', link);
    return fetch(link);
})
.then(r => r.text())
.then(html => {
    require('fs').writeFileSync('cabreira-live.html', html);
    console.log('Saved to cabreira-live.html');
});
