import { requireAdmin } from '@/app/lib/auth-helpers';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const adminCheck = await requireAdmin();
        
        if (!adminCheck.authorized) {
            return Response.json({
                success: adminCheck.status < 500,
                isSignedIn: !!adminCheck.userId,
                isAdmin: false,
                isMaster: false,
                role: adminCheck.userId ? 'user' : 'guest',
                error: adminCheck.error
            }, { status: adminCheck.status >= 500 ? adminCheck.status : 200 });
        }

        return Response.json({
            success: true,
            isSignedIn: true,
            isAdmin: true,
            isMaster: adminCheck.isMaster,
            role: adminCheck.role,
            user: {
                id: adminCheck.userId,
                name: adminCheck.user?.fullName || `${adminCheck.user?.firstName || ''} ${adminCheck.user?.lastName || ''}`.trim() || 'Admin',
                email: adminCheck.userEmail,
                imageUrl: adminCheck.user?.imageUrl
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
