import { deepScrapeCabreira } from './app/lib/scrapers/cabreira.js';

async function test() {
    try {
        console.log('Testing deepScrapeCabreira...');
        const result = await deepScrapeCabreira('https://cabreirasolutions.com/evento/granfondo-medio-tejo/');
        console.log('Result:', result);
    } catch (e) {
        console.error('Error:', e);
    }
}
test();
