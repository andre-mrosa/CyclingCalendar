import { clerkClient } from '@clerk/nextjs/server';
import { requireAdmin, isMasterAdmin } from '@/app/lib/auth-helpers';
import { logSystem, logError } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

export async function POST(request, { params }) {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const resolvedParams = await params;
        const targetUserId = resolvedParams.id;
        const body = await request.json();
        const { newRole } = body;

        if (!targetUserId) {
            return Response.json({ success: false, error: 'ID de utilizador obrigatório.' }, { status: 400 });
        }

        if (!newRole || !['admin', 'user'].includes(newRole)) {
            return Response.json({ success: false, error: 'Cargo inválido. Deve ser "admin" ou "user".' }, { status: 400 });
        }

        const client = await clerkClient();
        const targetUser = await client.users.getUser(targetUserId);

        if (!targetUser) {
            return Response.json({ success: false, error: 'Utilizador não encontrado no Clerk.' }, { status: 404 });
        }

        const targetEmail = targetUser.emailAddresses?.find(e => e.id === targetUser.primaryEmailAddressId)?.emailAddress || targetUser.emailAddresses?.[0]?.emailAddress || 'Sem email';

        // Proteção permanente do Master Admin
        if (isMasterAdmin(targetUser)) {
            return Response.json({
                success: false,
                error: 'O Master Admin possui privilégios permanentes e o seu cargo não pode ser alterado.'
            }, { status: 403 });
        }

        // Atualizar publicMetadata no Clerk
        const currentMetadata = targetUser.publicMetadata || {};
        await client.users.updateUserMetadata(targetUserId, {
            publicMetadata: {
                ...currentMetadata,
                role: newRole
            }
        });

        // Registar Log
        await logSystem({
            level: 'INFO',
            source: 'AUTH',
            message: `Cargo de ${targetEmail} alterado para "${newRole.toUpperCase()}" por ${adminCheck.userEmail}`,
            details: {
                targetUserId,
                targetEmail,
                previousRole: currentMetadata.role || 'user',
                newRole,
                modifiedBy: adminCheck.userEmail,
                modifiedById: adminCheck.userId
            },
            userId: adminCheck.userId,
            userEmail: adminCheck.userEmail
        });

        return Response.json({
            success: true,
            message: `Cargo de ${targetEmail} atualizado para ${newRole.toUpperCase()} com sucesso.`,
            user: {
                id: targetUserId,
                email: targetEmail,
                role: newRole
            }
        });

    } catch (error) {
        logError('AUTH', `Erro ao alterar cargo de utilizador: ${error.message}`, error, { id: adminCheck.userId, email: adminCheck.userEmail });
        console.error('Error updating user role:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
