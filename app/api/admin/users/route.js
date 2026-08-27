import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/app/lib/db';
import { requireAdmin, isMasterAdmin, getUserRole } from '@/app/lib/auth-helpers';
import { logInfo, logError } from '@/app/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request) {
    const adminCheck = await requireAdmin();
    if (!adminCheck.authorized) {
        return Response.json({ success: false, error: adminCheck.error }, { status: adminCheck.status });
    }

    try {
        const client = await clerkClient();
        const [response, pendingRequests] = await Promise.all([
            client.users.getUserList({
                limit: 100,
                orderBy: '-created_at'
            }),
            prisma.accountDeletionRequest.findMany({
                where: { status: 'PENDING' }
            })
        ]);

        const pendingMap = new Map(pendingRequests.map(r => [r.userId, r]));

        // Obter lista de utilizadores da resposta (compatível com Clerk paginated result ou array)
        const userList = Array.isArray(response) ? response : (response?.data || []);

        const formattedUsers = userList.map(u => {
            const primaryEmail = u.emailAddresses?.find(e => e.id === u.primaryEmailAddressId)?.emailAddress || u.emailAddresses?.[0]?.emailAddress || 'Sem email';
            const isMaster = isMasterAdmin(u);
            const role = getUserRole(u);
            const pendingReq = pendingMap.get(u.id);

            return {
                id: u.id,
                firstName: u.firstName || '',
                lastName: u.lastName || '',
                fullName: `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Utilizador sem nome',
                email: primaryEmail,
                imageUrl: u.imageUrl,
                role: role,
                isMaster: isMaster,
                createdAt: u.createdAt,
                lastSignInAt: u.lastSignInAt,
                banned: u.banned || false,
                deletionRequested: !!pendingReq || !!u.publicMetadata?.deletionRequested,
                deletionType: pendingReq?.type || u.publicMetadata?.deletionType || 'DELETE_ACCOUNT',
                deletionReason: pendingReq?.reason || null,
                deletionRequestedAt: pendingReq?.createdAt || u.publicMetadata?.deletionRequestedAt || null
            };
        });

        logInfo('AUTH', `Admin ${adminCheck.userEmail} consultou a lista de ${formattedUsers.length} utilizadores`, null, { id: adminCheck.userId, email: adminCheck.userEmail });

        return Response.json({
            success: true,
            total: formattedUsers.length,
            users: formattedUsers,
            pendingDeletionsCount: pendingRequests.length
        });

    } catch (error) {
        logError('AUTH', `Erro ao listar utilizadores no Clerk: ${error.message}`, error, { id: adminCheck.userId, email: adminCheck.userEmail });
        console.error('Error fetching Clerk users:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
