import { prisma } from '@/app/lib/db';

export async function GET() {
    await prisma.event.updateMany({
        where: { source: 'FPC' },
        data: { programa: null }
    });
    return Response.json({ success: true });
}
