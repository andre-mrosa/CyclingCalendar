import { prisma } from '../../lib/db';
import { deepScrapeCabreira } from '../../lib/scrapers/cabreira';
import { NextResponse } from 'next/server';

export async function GET() {
    const events = await prisma.event.findMany({
        where: {
            OR: [
                { extraLinks: { contains: 'cabreirasolutions' } },
                { source: { contains: 'cabreirasolutions' } },
                { link: { contains: 'cabreirasolutions' } }
            ]
        }
    });
    
    const results = [];
    for (const ev of events) {
        let link = ev.link;
        if (!link || !link.includes('cabreirasolutions')) {
            if (ev.extraLinks) {
                try {
                    const parsed = JSON.parse(ev.extraLinks);
                    const cabLink = parsed.find(l => l.link.includes('cabreirasolutions'));
                    if (cabLink) link = cabLink.link;
                } catch (e) {}
            }
        }
        if (!link) continue;
        
        const details = await deepScrapeCabreira(link);
        const updateData = {};
        if (details.insurance) updateData.insurance = details.insurance;
        if (details.prices) updateData.prices = details.prices;
        if (details.prizes) updateData.prizes = details.prizes;
        if (details.programa) updateData.programa = details.programa;
        
        if (Object.keys(updateData).length > 0) {
            await prisma.event.update({
                where: { id: ev.id },
                data: updateData
            });
            results.push(`Updated ${ev.title}`);
        }
    }
    return NextResponse.json({ success: true, results });
}
