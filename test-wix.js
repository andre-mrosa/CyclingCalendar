const https = require('https');

async function run() {
    https.get('https://ciclismosantarem.wixsite.com/ciclismo/calendarios', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log("Response length:", data.length);
            console.log("Contains 'calendário'?", data.toLowerCase().includes('calend'));
            console.log("Contains 'provas'?", data.toLowerCase().includes('prova'));
            // Print a small snippet to see if it's just a JS payload
            const lines = data.split('\n');
            for(let i=0; i<Math.min(30, lines.length); i++) {
                if (lines[i].includes('Prova') || lines[i].includes('Taça')) {
                    console.log(lines[i].substring(0, 100));
                }
            }
            // Check for JSON payload inside wix site
            const match = data.match(/var publicModel = (.*?);/);
            if (match) {
                console.log("Found wix public model json");
            }
        });
    });
}
run();
