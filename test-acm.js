const https = require('https');

async function run() {
    https.get('https://www.acm.pt/calendario', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log("Response length:", data.length);
            console.log("Contains 'calendário'?", data.toLowerCase().includes('calend'));
            // Print a small snippet
            const lines = data.split('\n');
            let found = 0;
            for(let i=0; i<lines.length; i++) {
                if (lines[i].includes('event') || lines[i].includes('prova') || lines[i].includes('taça')) {
                    if (found < 10) console.log(lines[i].trim().substring(0, 100));
                    found++;
                }
            }
            console.log("Total found matches:", found);
        });
    });
}
run();
