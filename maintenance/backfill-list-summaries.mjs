import { prisma } from '../app/lib/db.js';
import { hydrateListSummaries } from '../app/lib/calendarSummary.js';
try {
    let count = 0;
    for (;;) {
        const rows = await prisma.$queryRaw`SELECT "id" FROM "Event" WHERE "listSummary" IS NULL LIMIT 50`;
        if (!rows.length) break;
        await hydrateListSummaries(prisma, rows.map(row => row.id));
        count += rows.length;
        console.log('Summaries:', count);
    }
} finally { await prisma.$disconnect(); await globalThis.pgPool?.end(); }
