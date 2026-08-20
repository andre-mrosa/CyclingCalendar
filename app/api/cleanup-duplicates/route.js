import { prisma } from '@/app/lib/db';

export async function GET(request) {
    try {
        const events = await prisma.event.findMany({
            where: { source: 'FPC' }
        });

        // Força o re-scrape limpando as caches HTML da FPC
        await prisma.event.updateMany({
            where: { source: 'FPC' },
            data: { programa: null }
        });

        const byTitle = {};
        for (const ev of events) {
            if (!byTitle[ev.title]) byTitle[ev.title] = [];
            byTitle[ev.title].push(ev);
        }

        let deleted = 0;
        let deletedIds = [];
        for (const title in byTitle) {
            const evs = byTitle[title];
            if (evs.length > 1) {
                const oldVersions = evs.filter(e => !e.date.includes(' a '));
                const newVersions = evs.filter(e => e.date.includes(' a '));
                
                if (oldVersions.length > 0 && newVersions.length > 0) {
                    for (const old of oldVersions) {
                        await prisma.event.delete({ where: { id: old.id } });
                        deletedIds.push(old.id);
                        deleted++;
                    }
                }
            }
        }

        return Response.json({ success: true, deleted, deletedIds });
    } catch(e) {
        return Response.json({ success: false, error: e.message });
    }
}
