import { prisma } from '@/app/lib/db';
import { requireAdmin } from '@/app/lib/auth-helpers';
import { logError } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const oneDayAgo = new Date();
        oneDayAgo.setHours(oneDayAgo.getHours() - 24);

        const [pendingRequests, recentErrorsCount] = await Promise.all([
            prisma.accountDeletionRequest.findMany({
                where: { status: 'PENDING' },
                orderBy: { createdAt: 'desc' }
            }),
            prisma.systemLog.count({
                where: {
                    level: 'ERROR',
                    createdAt: { gte: oneDayAgo }
                }
            })
        ]);

        const deletionCount = pendingRequests.length;

        return Response.json({
            success: true,
            notifications: {
                deletionRequests: {
                    count: deletionCount,
                    items: pendingRequests
                },
                recentErrors: {
                    count: recentErrorsCount
                },
                totalActionable: deletionCount
            }
        });
    } catch (e) {
        logError('API', `Erro ao obter notificações de administração: ${e.message}`, e, { id: adminCheck.userId, email: adminCheck.userEmail });
        console.error('Error fetching admin notifications:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}
