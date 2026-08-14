import { deepScrapeCabreira } from './app/lib/scrapers/cabreira.js';

async function test() {
    const urls = [
        'https://cabreirasolutions.com/evento/racenature-castelo-de-vide/',
        'https://cabreirasolutions.com/evento/granfondo-leiria-region/'
    ];
    for (const url of urls) {
        console.log('\n--- Testing', url, '---');
        const result = await deepScrapeCabreira(url);
        console.log('Description:', result.description ? result.description.length + ' chars' : 'null');
        console.log('Prices:', result.prices ? result.prices.length + ' chars' : 'null');
        console.log('Insurance:', result.insurance ? result.insurance.length + ' chars' : 'null');
        console.log('Prizes:', result.prizes ? result.prizes.length + ' chars' : 'null');
        console.log('Programa:', result.programa ? result.programa.length + ' chars' : 'null');
    }
}

test().catch(console.error);
