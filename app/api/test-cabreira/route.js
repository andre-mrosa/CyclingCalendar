import { prisma } from '../../lib/db';
import { deepScrapeCabreira } from '../../lib/scrapers/cabreira';
import { NextResponse } from 'next/server';

export async function GET(request) {
    try {
        const events = await prisma.event.findMany({
            where: {
                OR: [
                    { title: { contains: 'Basto', mode: 'insensitive' } },
                    { details: { contains: 'Basto', mode: 'insensitive' } },
                    { title: { contains: 'Rota', mode: 'insensitive' } }
                ]
            }
        });
        return NextResponse.json({ success: true, count: events.length, events });
    } catch(e) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
