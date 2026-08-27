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
        const [response, pendingRequests] = await Promise.all([
            (async () => {
                try {
                    const client = await clerkClient();
                    return await client.users.getUserList({ limit: 100 });
                } catch (e) {
                    console.error('Error in client.users.getUserList:', e);
                    return [];
                }
            })(),
            prisma.accountDeletionRequest.findMany({
                where: { status: 'PENDING' }
            }).catch(() => [])
        ]);

        const pendingMap = new Map(pendingRequests.map(r => [r.userId, r]));

        // Obter lista de utilizadores da resposta e ordenar do mais recente para o mais antigo
        const rawList = Array.isArray(response) ? response : (response?.data || []);
        const userList = [...rawList].sort((a, b) => {
            const timeA = new Date(a.createdAt || 0).getTime();
            const timeB = new Date(b.createdAt || 0).getTime();
            return timeB - timeA;
        });

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

        // Gravação assíncrona não-bloqueante
        logInfo('AUTH', `Admin ${adminCheck.userEmail} consultou a lista de ${formattedUsers.length} utilizadores`, null, { id: adminCheck.userId, email: adminCheck.userEmail }).catch?.(() => {});

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
