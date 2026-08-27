import { auth, clerkClient } from '@clerk/nextjs/server';
import { isMasterAdmin, getUserRole } from '@/app/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { userId } = await auth();
        
        if (!userId) {
            return Response.json({
                success: true,
                isSignedIn: false,
                isAdmin: false,
                isMaster: false,
                role: 'guest'
            });
        }

        const client = await clerkClient();
        const user = await client.users.getUser(userId);
        
        if (!user) {
            return Response.json({
                success: true,
                isSignedIn: false,
                isAdmin: false,
                isMaster: false,
                role: 'guest'
            });
        }

        const isMaster = isMasterAdmin(user);
        const role = getUserRole(user);
        const isAdmin = isMaster || role === 'admin';
        const primaryEmail = user.emailAddresses?.find(e => e.id === user.primaryEmailAddressId)?.emailAddress || user.emailAddresses?.[0]?.emailAddress || '';

        return Response.json({
            success: true,
            isSignedIn: true,
            isAdmin,
            isMaster,
            role,
            user: {
                id: user.id,
                name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Utilizador',
                email: primaryEmail,
                imageUrl: user.imageUrl
            }
        });
    } catch (error) {
        console.error('Error in /api/admin/me:', error);
        return Response.json({
            success: false,
            error: error.message,
            isAdmin: false,
            isMaster: false
        }, { status: 500 });
    }
}
