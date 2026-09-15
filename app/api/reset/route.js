import { requireAdmin } from '@/app/lib/auth-helpers';
import { prisma } from '@/app/lib/db';

export async function GET() {
    const admin = await requireAdmin();
    if (!admin.authorized) return Response.json({ success: false, error: admin.error }, { status: admin.status });

    await prisma.event.updateMany({
        where: { source: 'FPC' },
        data: { programa: null }
    });
    return Response.json({ success: true });
}
