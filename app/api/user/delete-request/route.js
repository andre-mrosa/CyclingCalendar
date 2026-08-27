import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/db';
import { logSystem, logWarn, logInfo, logError } from '@/app/lib/logger';
import { isMasterAdmin } from '@/app/lib/auth-helpers';

export const dynamic = 'force-dynamic';

// 1. Obter estado do pedido de eliminação do utilizador atual
export async function GET() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const request = await prisma.accountDeletionRequest.findUnique({
            where: { userId }
        });

        return Response.json({
            success: true,
            hasPendingRequest: request?.status === 'PENDING',
            request: request || null
        });
    } catch (e) {
        console.error('Error fetching deletion request:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}

// 2. Submeter pedido de eliminação de conta
export async function POST(request) {
    try {
        const { userId } = await auth();
        if (!userId) {
            return Response.json({ success: false, error: 'Tens de iniciar sessão para efetuar este pedido.' }, { status: 401 });
        }

        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        if (!user) {
            return Response.json({ success: false, error: 'Utilizador não encontrado no sistema.' }, { status: 404 });
        }

        const primaryEmail = user.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || user.emailAddresses?.[0]?.emailAddress || 'Sem email';
        const fullName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilizador';

        // Master Admin não pode pedir eliminação por esta via
        if (isMasterAdmin(user)) {
            return Response.json({ 
                success: false, 
                error: 'O Master Admin não pode submeter pedidos de auto-eliminação.' 
            }, { status: 403 });
        }

        let body = {};
        try {
            body = await request.json();
        } catch {}
        const type = body.type === 'DELETE_DATA' ? 'DELETE_DATA' : 'DELETE_ACCOUNT';
        const reason = body.reason?.trim() || null;

        // Criar ou atualizar pedido na base de dados
        const deletionReq = await prisma.accountDeletionRequest.upsert({
            where: { userId },
            update: {
                userEmail: primaryEmail,
                userName: fullName,
                type,
                reason,
                status: 'PENDING',
                updatedAt: new Date()
            },
            create: {
                userId,
                userEmail: primaryEmail,
                userName: fullName,
                type,
                reason,
                status: 'PENDING'
            }
        });

        // Atualizar metadados no Clerk
        await client.users.updateUserMetadata(userId, {
            publicMetadata: {
                ...user.publicMetadata,
                deletionRequested: true,
                deletionType: type,
                deletionRequestedAt: new Date().toISOString()
            }
        });

        const actionTitle = type === 'DELETE_DATA' ? 'eliminação de dados e favoritos' : 'eliminação definitiva de conta';

        // Registar Log de Alerta no Sistema
        await logWarn('AUTH', `Pedido de ${actionTitle} recebido de ${primaryEmail}`, {
            userId,
            userEmail: primaryEmail,
            userName: fullName,
            type,
            reason: reason || 'Nenhum motivo especificado'
        }, { id: userId, email: primaryEmail });

        return Response.json({
            success: true,
            message: `O teu pedido de ${actionTitle} foi registado com sucesso e será processado pela administração.`,
            request: deletionReq
        });

    } catch (e) {
        logError('AUTH', `Erro ao submeter pedido de eliminação de conta: ${e.message}`, e);
        console.error('Error creating deletion request:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}

// 3. Cancelar pedido de eliminação pendente
export async function DELETE() {
    try {
        const { userId } = await auth();
        if (!userId) {
            return Response.json({ success: false, error: 'Não autenticado' }, { status: 401 });
        }

        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        const primaryEmail = user?.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || user?.emailAddresses?.[0]?.emailAddress || 'Sem email';

        await prisma.accountDeletionRequest.updateMany({
            where: { userId, status: 'PENDING' },
            data: { status: 'CANCELLED', updatedAt: new Date() }
        });

        if (user) {
            const publicMeta = { ...user.publicMetadata };
            delete publicMeta.deletionRequested;
            delete publicMeta.deletionRequestedAt;
            await client.users.updateUserMetadata(userId, {
                publicMetadata: publicMeta
            });
        }

        await logInfo('AUTH', `Utilizador ${primaryEmail} cancelou o pedido de eliminação de conta`, null, { id: userId, email: primaryEmail });

        return Response.json({
            success: true,
            message: 'O pedido de eliminação de conta foi cancelado com sucesso.'
        });

    } catch (e) {
        logError('AUTH', `Erro ao cancelar pedido de eliminação de conta: ${e.message}`, e);
        console.error('Error cancelling deletion request:', e);
        return Response.json({ success: false, error: e.message }, { status: 500 });
    }
}
