const https = require('https');

async function fetchHtml(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

async function run() {
    for (const year of [2024, 2025, 2026]) {
        const text = await fetchHtml('https://www.fpciclismo.pt/calendario-provas-de-ciclismo?y=' + year);
        const low = text.toLowerCase();
        console.log(`Year ${year}:`);
        console.log(`  'santarém':`, (low.match(/santarém/g) || []).length);
        console.log(`  'santarem':`, (low.match(/santarem/g) || []).length);
        console.log(`  'regional':`, (low.match(/regional/g) || []).length);
        console.log(`  'campeonato regional':`, (low.match(/campeonato regional/g) || []).length);
    }
}
run();
