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
        const rawLimit = searchParams.get('limit') ?? '100';
        const rawPage = searchParams.get('page') ?? '1';
        if (![rawLimit, rawPage].every(value => /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) && Number(value) > 0)) {
            return Response.json({ success: false, error: 'Paginação inválida.' }, { status: 400 });
        }
        const limit = Math.min(Number(rawLimit), 500);
        const page = Number(rawPage);
        const skip = (page - 1) * limit;
        if (!Number.isSafeInteger(skip)) return Response.json({ success: false, error: 'Página inválida.' }, { status: 400 });

        const where = { id: { not: 'operational-scraper-lease' } };

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
                prisma.systemLog.count({ where: { level: 'ERROR', id: { not: 'operational-scraper-lease' } } }),
                prisma.systemLog.count({ where: { level: 'WARN', id: { not: 'operational-scraper-lease' } } }),
                prisma.systemLog.count({ where: { level: 'INFO', id: { not: 'operational-scraper-lease' } } })
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
        return Response.json({ success: false, error: 'Não foi possível consultar os logs. Tenta novamente.' }, { status: 503 });
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
        const allParam = searchParams.get('all');
        if ((allParam !== null && !['true', 'false'].includes(allParam)) ||
            (clearAll && daysParam !== null) ||
            (daysParam !== null && (!/^\d+$/.test(daysParam) || !Number.isSafeInteger(Number(daysParam)) || Number(daysParam) < 1 || Number(daysParam) > 36500))) {
            return Response.json({ success: false, error: 'Período de retenção inválido. Indica entre 1 e 36500 dias ou a eliminação total.' }, { status: 400 });
        }

        let count = 0;
        if (clearAll) {
            const res = await prisma.systemLog.deleteMany({ where: { id: { not: 'operational-scraper-lease' } } });
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
