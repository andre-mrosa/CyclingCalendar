require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const { deepScrapeCabreira } = require('./app/lib/scrapers/cabreira.js');

async function run() {
    const events = await prisma.evento.findMany({
        where: {
            links: {
                some: {
                    link: { contains: 'cabreirasolutions' }
                }
            }
        },
        include: { links: true }
    });
    console.log(`Found ${events.length} cabreira events to update`);
    
    for (const ev of events) {
        const link = ev.links.find(l => l.link.includes('cabreirasolutions'))?.link;
        if (!link) continue;
        
        console.log(`Scraping ${ev.title}...`);
        const details = await deepScrapeCabreira(link);
        
        const updateData = {};
        if (details.insurance) updateData.insurance = details.insurance;
        if (details.prices) updateData.prices = details.prices;
        if (details.prizes) updateData.prizes = details.prizes;
        if (details.programa) updateData.programa = details.programa;
        
        if (Object.keys(updateData).length > 0) {
            await prisma.evento.update({
                where: { id: ev.id },
                data: updateData
            });
            console.log(`Updated ${ev.title}`);
        }
    }
    console.log('Done');
}
run().catch(console.error).finally(() => prisma.$disconnect());
