const cheerio = require('cheerio');
fetch('https://cabreirasolutions.com/eventos/').then(r => r.text()).then(html => {
  const $ = cheerio.load(html);
  console.log($('form').length, 'forms');
  console.log($('select').map((i, el) => $(el).attr('name')).get());
})
