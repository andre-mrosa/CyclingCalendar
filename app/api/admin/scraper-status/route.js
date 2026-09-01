import { prisma } from '@/app/lib/db';
import { requireAdmin } from '@/app/lib/auth-helpers';
import { parseScraperStatus, readLogDetails } from '@/app/lib/admin/scraperStatus';

export const dynamic = 'force-dynamic';

export async function GET() {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        // Locate the latest start independently of log volume or age.
        const startLog = await prisma.systemLog.findFirst({
            where: {
                source: 'SCRAPER',
                OR: [
                    { message: { contains: 'Iniciada sincronização', mode: 'insensitive' } },
                    { details: { contains: '"event": "run-start"' } }
                ]
            },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
        });
        const now = Date.now();
        if (!startLog) return Response.json(parseScraperStatus({ now }));
        const runId = readLogDetails(startLog).runId;
        const scope = {
            createdAt: { gte: startLog.createdAt, lte: new Date(now) },
            // Include scoped helper errors (e.g. TRANSLATION_SERVICE) too.
            ...(runId ? { details: { contains: runId } } : { source: 'SCRAPER' })
        };
        // Fetch completion independently: a compact structured summary is enough
        // even when verbose logs push source summaries out of the bounded list.
        const completionLog = await prisma.systemLog.findFirst({
            where: { ...scope, OR: [
                { message: { contains: 'Sincronização global concluída', mode: 'insensitive' } },
                { message: { contains: 'Falha crítica na sincronização', mode: 'insensitive' } }
            ] },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }]
        });
        const logs = await prisma.systemLog.findMany({
            where: { ...scope, createdAt: { gte: startLog.createdAt, lte: completionLog?.createdAt || new Date(now) } },
            orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
            take: 300
        });
        return Response.json(parseScraperStatus({ startLog, completionLog, logs, now }));
    } catch (error) {
        console.error('Error checking scraper status:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
