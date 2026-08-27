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
            totalEvents,
            fpcEvents,
            cabreiraEvents,
            eventsWithRegCloses,
            eventsWithPrices,
            eventsWithProgramme,
            totalLogs,
            errorLogs,
            recentLogs
        ] = await Promise.all([
            prisma.event.count(),
            prisma.event.count({ where: { source: 'FPC' } }),
            prisma.event.count({ where: { source: 'Cabreira' } }),
            prisma.event.count({ where: { registrationClosesAt: { not: null } } }),
            prisma.event.count({ where: { prices: { not: null } } }),
            prisma.event.count({ where: { programa: { not: null } } }),
            prisma.systemLog.count(),
            prisma.systemLog.count({ where: { level: 'ERROR' } }),
            prisma.systemLog.findMany({
                take: 5,
                orderBy: { createdAt: 'desc' },
                select: { id: true, level: true, source: true, message: true, createdAt: true }
            })
        ]);

        let totalUsers = 0;
        try {
            const client = await clerkClient();
            const users = await client.users.getUserList({ limit: 1 });
            totalUsers = typeof users?.totalCount === 'number' ? users.totalCount : (Array.isArray(users) ? users.length : (users?.data?.length || 0));
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
