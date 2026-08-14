require('dotenv').config({ path: '.env.local' });

// We need to simulate the module environment for NextJS imports.
async function run() {
    const cabreira = await import('./app/lib/scrapers/cabreira.js');
    console.log('Testing deepScrapeCabreira...');
    const result = await cabreira.deepScrapeCabreira('https://cabreirasolutions.com/evento/granfondo-medio-tejo/');
    console.log('Result:', result);
}

run().catch(console.error);
