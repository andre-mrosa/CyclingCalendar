import { prisma } from '@/app/lib/db';
import { requireAdmin } from '@/app/lib/auth-helpers';
import { logInfo, logError } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

export function classifyQuarantineReason(event) {
    const text = `${event.title || ''} ${event.details || ''} ${event.tag || ''}`.toLowerCase();
    
    if (/\b(trail|ultra trail|utm|trilhos?|abutres|marão|rocha da pena|lamecum|transpeneda|zela|caramulo)\b/i.test(text) && !/\bbtt\b/i.test(event.title || '')) {
        return {
            category: 'trail',
            badge: 'Trail / Montanha',
            reason: 'Prova pedestre de Trail Running ou Ultra Trail na natureza (não é ciclismo).',
            color: 'orange'
        };
    }
    
    if (/\b(corrida|maratona|meia maratona|silvestre|corta-mato|estafeta|run|running|sunset|viriatos)\b/i.test(text) && !/\bbtt\b/i.test(event.title || '')) {
        return {
            category: 'athletics',
            badge: 'Atletismo / Corrida',
            reason: 'Corrida a pé pedestre, Meia Maratona de estrada ou prova de atletismo.',
            color: 'blue'
        };
    }

    if (/\b(skyrunning|sky race|vertical|km vertical|sky up)\b/i.test(text)) {
        return {
            category: 'skyrunning',
            badge: 'Skyrunning',
            reason: 'Corrida de montanha vertical / Skyrunning a pé.',
            color: 'purple'
        };
    }

    if (/\b(lynx|lynxrace|fuzileiros|obstaculos|obstacle)\b/i.test(text)) {
        return {
            category: 'ocr',
            badge: 'Obstáculos (OCR)',
            reason: 'Corrida de obstáculos militar / OCR (não é ciclismo).',
            color: 'amber'
        };
    }

    if (/\b(tt\b|todo terreno|todo-o-terreno|moto|quad)\b/i.test(text)) {
        return {
            category: 'motor',
            badge: 'TT Motorizado',
            reason: 'Passeio Todo-o-Terreno para veículos motorizados (motos/quads).',
            color: 'red'
        };
    }

    return {
        category: 'other_sport',
        badge: 'Filtro Stop & Go',
        reason: 'Modalidade desportiva não-ciclismo importada da plataforma Stop & Go.',
        color: 'gray'
    };
}

export async function GET(request) {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status, headers: { 'Cache-Control': 'no-store' } });
    }

    const { searchParams } = new URL(request.url);
    const search = (searchParams.get('search') || '').trim().toLowerCase();
    const category = searchParams.get('category') || 'ALL';

    try {
        const events = await prisma.event.findMany({
            where: {
                source: { contains: 'Quarentena' },
                ...(search ? {
                    OR: [
                        { title: { contains: search, mode: 'insensitive' } },
                        { details: { contains: search, mode: 'insensitive' } },
                        { distrito: { contains: search, mode: 'insensitive' } },
                    ]
                } : {})
            },
            select: {
                id: true,
                title: true,
                date: true,
                sortDate: true,
                details: true,
                tag: true,
                link: true,
                regiao: true,
                distrito: true,
                source: true,
                createdAt: true,
                updatedAt: true
            },
            orderBy: { sortDate: 'desc' }
        });

        const decorated = events.map(event => {
            const classification = classifyQuarantineReason(event);
            return {
                ...event,
                ...classification
            };
        }).filter(item => category === 'ALL' || item.category === category);

        // Stats summary for the quarantine view
        const categoriesCount = {};
        for (const item of events) {
            const c = classifyQuarantineReason(item).category;
            categoriesCount[c] = (categoriesCount[c] || 0) + 1;
        }

        return Response.json({
            success: true,
            total: decorated.length,
            categoriesCount,
            events: decorated
        }, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Error fetching quarantined events:', error);
        return Response.json({ success: false, error: 'Erro ao obter provas em quarentena.' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
    }
}

// Restore an event from quarantine into the public calendar
export async function PATCH(request) {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status, headers: { 'Cache-Control': 'no-store' } });
    }

    try {
        const body = await request.json();
        const { id, targetSource = 'Stop and Go' } = body || {};
        if (!id) {
            return Response.json({ success: false, error: 'ID da prova obrigatório.' }, { status: 400 });
        }

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) {
            return Response.json({ success: false, error: 'Prova não encontrada.' }, { status: 404 });
        }

        // Clean source by removing 'Quarentena'
        let newSource = event.source.replace(/Quarentena/g, '').replace(/,\s*,/g, ',').trim();
        newSource = newSource.replace(/^,\s*|,\s*$/g, '');
        if (!newSource) newSource = targetSource || 'Stop and Go';

        const updated = await prisma.event.update({
            where: { id },
            data: { source: newSource }
        });

        await logInfo('ADMIN', `Prova "${event.title}" restaurada da Quarentena por ${adminCheck.userEmail || adminCheck.userId}. Nova fonte: ${newSource}`, {
            eventId: id,
            action: 'QUARANTINE_RESTORE',
            userId: adminCheck.userId,
            userEmail: adminCheck.userEmail
        });

        return Response.json({ success: true, message: `Prova "${event.title}" restaurada com sucesso.`, event: updated });
    } catch (error) {
        console.error('Error restoring event from quarantine:', error);
        return Response.json({ success: false, error: 'Erro ao restaurar prova da quarentena.' }, { status: 500 });
    }
}

// Permanently delete an event in quarantine
export async function DELETE(request) {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status, headers: { 'Cache-Control': 'no-store' } });
    }

    try {
        const body = await request.json();
        const { id } = body || {};
        if (!id) {
            return Response.json({ success: false, error: 'ID da prova obrigatório.' }, { status: 400 });
        }

        const event = await prisma.event.findUnique({ where: { id } });
        if (!event) {
            return Response.json({ success: false, error: 'Prova não encontrada.' }, { status: 404 });
        }

        await prisma.event.delete({ where: { id } });

        await logInfo('ADMIN', `Prova "${event.title}" em Quarentena eliminada definitivamente por ${adminCheck.userEmail || adminCheck.userId}`, {
            eventId: id,
            action: 'QUARANTINE_DELETE',
            userId: adminCheck.userId,
            userEmail: adminCheck.userEmail
        });

        return Response.json({ success: true, message: `Prova "${event.title}" eliminada definitivamente.` });
    } catch (error) {
        console.error('Error deleting quarantined event:', error);
        return Response.json({ success: false, error: 'Erro ao eliminar prova.' }, { status: 500 });
    }
}
