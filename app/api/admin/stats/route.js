import { prisma } from '@/app/lib/db';
import { clerkClient } from '@clerk/nextjs/server';
import { requireAdmin } from '@/app/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const [
            totalEvents, fpcEvents, cabreiraEvents, eventsWithRegCloses, eventsWithPrices, eventsWithProgramme,
            totalLogs, errorLogs, recentLogs,
            totalUsers
        ] = await Promise.all([
            prisma.event.count().catch(() => 0),
            prisma.event.count({ where: { source: 'FPC' } }).catch(() => 0),
            prisma.event.count({ where: { source: 'Cabreira' } }).catch(() => 0),
            prisma.event.count({ where: { registrationClosesAt: { not: null } } }).catch(() => 0),
            prisma.event.count({ where: { prices: { not: null } } }).catch(() => 0),
            prisma.event.count({ where: { programa: { not: null } } }).catch(() => 0),
            prisma.systemLog.count().catch(() => 0),
            prisma.systemLog.count({ where: { level: 'ERROR' } }).catch(() => 0),
            prisma.systemLog.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, level: true, source: true, message: true, createdAt: true }
            }).catch(() => []),
            (async () => {
                try {
                    const client = await clerkClient();
                    if (typeof client.users.getCount === 'function') {
                        return await client.users.getCount();
                    }
                    const list = await client.users.getUserList({ limit: 1 });
                    return list?.totalCount ?? (Array.isArray(list) ? list.length : 0);
                } catch {
                    return 0;
                }
            })()
        ]);

        return Response.json({
            success: true,
            stats: {
                events: {
                    total: totalEvents,
                    fpc: fpcEvents,
                    cabreira: cabreiraEvents,
                    withRegistration: eventsWithRegCloses,
                    withPrices: eventsWithPrices,
                    withProgramme: eventsWithProgramme
                },
                users: {
                    total: totalUsers
                },
                logs: {
                    total: totalLogs,
                    errors: errorLogs,
                    recent: recentLogs
                }
            }
        });

    } catch (error) {
        console.error('Error in admin stats:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
