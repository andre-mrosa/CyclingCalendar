import { prisma } from '../../lib/db';
import { scrapeCabreira, deepScrapeCabreira } from '../../lib/scrapers/cabreira';
import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const years = [
            new Date().getFullYear().toString(),
            (new Date().getFullYear() + 1).toString()
        ];
        
        for (const year of years) {
            await scrapeCabreira(year);
        }

        const events = await prisma.event.findMany({
            where: {
                OR: [
                    { extraLinks: { contains: 'cabreirasolutions' } },
                    { source: { contains: 'cabreirasolutions' } },
                    { source: 'Cabreira' },
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
                        const cabLink = parsed.find(l => l.link && l.link.includes('cabreirasolutions'));
                        if (cabLink) link = cabLink.link;
                    } catch (e) {}
                }
            }
            if (!link) continue;
            
            const details = await deepScrapeCabreira(link);
            const updateData = {};
            if (details.description) updateData.description = details.description;
            if (details.insurance) updateData.insurance = details.insurance;
            if (details.prices) updateData.prices = details.prices;
            if (details.prizes) updateData.prizes = details.prizes;
            if (details.programa) updateData.programa = details.programa;
            if (details.opensAt) updateData.registrationOpensAt = details.opensAt;
            if (details.closesAt) updateData.registrationClosesAt = details.closesAt;
            
            if (details.additionalLinks && details.additionalLinks.length > 0) {
                let existingLinks = [];
                try {
                    if (ev.extraLinks) existingLinks = JSON.parse(ev.extraLinks);
                } catch (e) {}
                for (const addLink of details.additionalLinks) {
                    if (!existingLinks.some(l => l.link === addLink.link)) {
                        existingLinks.push(addLink);
                    }
                }
                updateData.extraLinks = JSON.stringify(existingLinks);
            }
            
            if (Object.keys(updateData).length > 0) {
                await prisma.event.update({
                    where: { id: ev.id },
                    data: updateData
                });
                results.push(`Updated ${ev.title}`);
            }
        }
        return NextResponse.json({ success: true, count: results.length, results });
    } catch (e) {
        return NextResponse.json({ success: false, error: e.message });
    }
}
