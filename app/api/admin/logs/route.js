import { prisma } from '@/app/lib/db';
import { requireAdmin } from '@/app/lib/auth-helpers';
import { cleanOldLogs, logSystem } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const level = searchParams.get('level') || 'ALL';
        const source = searchParams.get('source') || 'ALL';
        const search = searchParams.get('search') || '';
        const limit = Math.min(parseInt(searchParams.get('limit') || '100', 10), 500);
        const page = Math.max(parseInt(searchParams.get('page') || '1', 10), 1);
        const skip = (page - 1) * limit;

        const where = {};

        if (level !== 'ALL') {
            where.level = level.toUpperCase();
        }

        if (source !== 'ALL') {
            where.source = source.toUpperCase();
        }

        if (search.trim()) {
            where.OR = [
                { message: { contains: search, mode: 'insensitive' } },
                { details: { contains: search, mode: 'insensitive' } },
                { userEmail: { contains: search, mode: 'insensitive' } }
            ];
        }

        const [logs, total, totalErrors, totalWarns, totalInfos] = await Promise.all([
            prisma.systemLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip
            }),
            prisma.systemLog.count({ where }),
            prisma.systemLog.count({ where: { level: 'ERROR' } }),
            prisma.systemLog.count({ where: { level: 'WARN' } }),
            prisma.systemLog.count({ where: { level: 'INFO' } })
        ]);

        return Response.json({
            success: true,
            logs,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit)
            },
            stats: {
                totalErrors,
                totalWarns,
                totalInfos,
                totalLogs: totalErrors + totalWarns + totalInfos
            }
        });

    } catch (error) {
        console.error('Error querying system logs:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}

export async function DELETE(request) {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const daysParam = searchParams.get('days');
        const clearAll = searchParams.get('all') === 'true';

        let count = 0;
        if (clearAll) {
            const res = await prisma.systemLog.deleteMany({});
            count = res.count;
            await logSystem({
                level: 'WARN',
                source: 'SYSTEM',
                message: `Todos os logs (${count} registos) foram eliminados por ${adminCheck.userEmail}`,
                userId: adminCheck.userId,
                userEmail: adminCheck.userEmail
            });
        } else {
            const days = daysParam ? parseInt(daysParam, 10) : 30;
            count = await cleanOldLogs(days);
            await logSystem({
                level: 'INFO',
                source: 'SYSTEM',
                message: `Limpeza de logs com mais de ${days} dias (${count} registos removidos) efetuada por ${adminCheck.userEmail}`,
                userId: adminCheck.userId,
                userEmail: adminCheck.userEmail
            });
        }

        return Response.json({
            success: true,
            deletedCount: count,
            message: `${count} registos de logs eliminados com sucesso.`
        });

    } catch (error) {
        console.error('Error clearing logs:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
