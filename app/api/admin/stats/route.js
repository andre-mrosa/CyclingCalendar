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
        let totalEvents = 0, fpcEvents = 0, cabreiraEvents = 0, eventsWithRegCloses = 0, eventsWithPrices = 0, eventsWithProgramme = 0;
        let totalLogs = 0, errorLogs = 0, recentLogs = [];
        let totalUsers = 0;

        try {
            const [tEvents, fpc, cabreira, reg, prices, prog] = await Promise.all([
                prisma.event.count().catch(() => 0),
                prisma.event.count({ where: { source: 'FPC' } }).catch(() => 0),
                prisma.event.count({ where: { source: 'Cabreira' } }).catch(() => 0),
                prisma.event.count({ where: { registrationClosesAt: { not: null } } }).catch(() => 0),
                prisma.event.count({ where: { prices: { not: null } } }).catch(() => 0),
                prisma.event.count({ where: { programa: { not: null } } }).catch(() => 0)
            ]);
            totalEvents = tEvents;
            fpcEvents = fpc;
            cabreiraEvents = cabreira;
            eventsWithRegCloses = reg;
            eventsWithPrices = prices;
            eventsWithProgramme = prog;
        } catch (e) {
            console.error('Error fetching event stats:', e);
        }

        try {
            const [tLogs, eLogs, rLogs] = await Promise.all([
                prisma.systemLog.count().catch(() => 0),
                prisma.systemLog.count({ where: { level: 'ERROR' } }).catch(() => 0),
                prisma.systemLog.findMany({
                    take: 5,
                    orderBy: { createdAt: 'desc' },
                    select: { id: true, level: true, source: true, message: true, createdAt: true }
                }).catch(() => [])
            ]);
            totalLogs = tLogs;
            errorLogs = eLogs;
            recentLogs = rLogs;
        } catch (e) {
            console.error('Error fetching log stats:', e);
        }

        try {
            const client = await clerkClient();
            const users = await client.users.getUserList({ limit: 100 }).catch(() => []);
            totalUsers = Array.isArray(users) ? users.length : (users?.data?.length || 0);
        } catch (e) {
            console.error('Error fetching users count for stats:', e);
        }

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
