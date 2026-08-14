import { deepScrapeCabreira } from '../../lib/scrapers/cabreira';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        console.log("Testing Leiria Region...");
        const data = await deepScrapeCabreira('https://cabreirasolutions.com/evento/racenature-castelo-de-vide/');
        const details = await deepScrapeCabreira('https://cabreirasolutions.com/evento/racenature-castelo-de-vide/');
        return NextResponse.json({ success: true, details });
    } catch(e) {
        console.error(e);
        return NextResponse.json({ success: false, error: e.message });
    }
}
