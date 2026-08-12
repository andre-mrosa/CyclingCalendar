const cheerio = require('cheerio');
const body1 = new URLSearchParams({ epoca_site2: '2024' });
const body2 = new URLSearchParams({ epoca_site: '2024' });

fetch('https://www.fpciclismo.pt/calendario', {
  method: 'POST',
  body: body1,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
}).then(r => r.text()).then(html => {
  console.log('With epoca_site2 2024:', (html.match(/2024/g) || []).length, '2026:', (html.match(/2026/g) || []).length);
});

fetch('https://www.fpciclismo.pt/calendario', {
  method: 'POST',
  body: body2,
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
}).then(r => r.text()).then(html => {
  console.log('With epoca_site 2024:', (html.match(/2024/g) || []).length, '2026:', (html.match(/2026/g) || []).length);
});
