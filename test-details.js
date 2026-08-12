const cheerio = require('cheerio');

async function testCabreira() {
    const url = 'https://cabreirasolutions.com/evento/2-taca-de-portugal-xcm-melgaco/'; // typical Cabreira event
    const res = await fetch(url);
    const html = await res.text();
    const $ = cheerio.load(html);
    
    // Check for Programa section
    let programa = '';
    
    // Usually it's in a div or tab called Programa
    // Let's print out all h2/h3 to see the structure
    $('h2, h3').each((i, el) => {
        console.log('Heading:', $(el).text().trim());
    });
    
    // Check if there is an element with 'Programa'
    $('*').each((i, el) => {
        const text = $(el).text().trim().toLowerCase();
        if (text === 'programa') {
            console.log('Found Programa element:', el.tagName);
            console.log('Next sibling:', $(el).next().text().substring(0, 100));
        }
    });
}
testCabreira();
