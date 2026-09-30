import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/db';
import { eraseAccountActivity } from '@/app/lib/eraseAccountActivity';
import { requireAdmin, isMasterAdmin } from '@/app/lib/auth-helpers';
import { logSystem, logWarn, logError } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

export async function DELETE(request, { params }) {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const resolvedParams = await params;
        const targetUserId = resolvedParams.id;
        const { searchParams } = new URL(request.url);
        const mode = searchParams.get('mode') ?? 'delete_account'; // 'delete_data' | 'delete_account'

        if (!targetUserId) {
            return Response.json({ success: false, error: 'ID de utilizador obrigatório.' }, { status: 400 });
        }

        if (!['delete_data', 'delete_account'].includes(mode)) {
            return Response.json({ success: false, error: 'Operação de eliminação inválida.' }, { status: 400 });
        }

        const client = await clerkClient();
        let targetUser = null;
        try {
            targetUser = await client.users.getUser(targetUserId);
        } catch (e) {
            if (e.status === 404) {
                return Response.json({ success: false, error: 'Utilizador não encontrado.' }, { status: 404 });
            }
            throw e;
        }

        if (!targetUser) return Response.json({ success: false, error: 'Utilizador não encontrado.' }, { status: 404 });

        if (targetUser && isMasterAdmin(targetUser)) {
            return Response.json({
                success: false,
                error: 'O Master Admin possui proteção absoluta e não pode ser eliminado.'
            }, { status: 403 });
        }

        const targetEmail = targetUser?.emailAddresses?.find(e => e.id === targetUser?.primaryEmailAddressId)?.emailAddress || targetUser?.emailAddresses?.[0]?.emailAddress || 'Desconhecido';

        await prisma.favoriteAlert.deleteMany({ where: { userId: targetUserId } });

        if (mode === 'delete_data') {
            // 1. Limpar apenas dados (favoritos e metadados)
            if (targetUser) {
                await client.users.updateUserMetadata(targetUserId, {
                    unsafeMetadata: {
                        favorites: []
                    },
                    privateMetadata: { calendarSubscriptionToken: null },
                    publicMetadata: {
                        ...targetUser.publicMetadata,
                        dataClearedAt: new Date().toISOString(),
                        deletionRequested: false
                    }
                });
            }

            // Atualizar pedido para processado se existir
            await eraseAccountActivity(prisma, targetUserId);

            await logWarn('AUTH', `Dados do utilizador ${targetEmail} foram eliminados por ${adminCheck.userEmail}`, {
                targetUserId,
                targetEmail,
                action: 'DELETE_DATA',
                performedBy: adminCheck.userEmail
            }, { id: adminCheck.userId, email: adminCheck.userEmail });

            return Response.json({
                success: true,
                message: `Os favoritos, alertas, subscrição e histórico de navegação associados à conta foram eliminados. As preferências guardadas no navegador podem ser removidas nas definições.`
            });

        } else {
            // 2. Eliminar conta permanentemente no Clerk
            if (targetUser) {
                await client.users.deleteUser(targetUserId);
            }

            // Atualizar estado do pedido de eliminação
            await eraseAccountActivity(prisma, targetUserId);

            await logWarn('AUTH', `Conta do utilizador ${targetEmail} (${targetUserId}) foi ELIMINADA PERMANENTEMENTE por ${adminCheck.userEmail}`, {
                targetUserId,
                targetEmail,
                action: 'DELETE_ACCOUNT',
                performedBy: adminCheck.userEmail
            }, { id: adminCheck.userId, email: adminCheck.userEmail });

            return Response.json({
                success: true,
                message: `A conta de ${targetEmail} foi eliminada permanentemente do sistema.`
            });
        }

    } catch (error) {
        logError('AUTH', `Erro ao eliminar utilizador: ${error.message}`, error, { id: adminCheck.userId, email: adminCheck.userEmail });
        console.error('Error deleting user:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
