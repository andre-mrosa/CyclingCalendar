import { start } from 'workflow/api';
import { prisma } from '@/app/lib/db';
import { pushAvailable } from '@/app/lib/favoritePush';
import { favoritePushWorkflow } from '@/app/workflows/favoritePush';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export async function GET(request) {
    if (!process.env.CRON_SECRET) return Response.json({ error: 'Cron unavailable' }, { status: 503 });
    if (request.headers.get('authorization') !== 'Bearer ' + process.env.CRON_SECRET) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (!pushAvailable()) return Response.json({ success: true, unavailable: true });
    const now = new Date();
    const day = now.toISOString().slice(0, 10);
    try {
        try { await prisma.pushScheduleRun.create({ data: { day } }); }
        catch (error) {
            if (error.code === 'P2002') return Response.json({ success: true, alreadyStarted: true });
            throw error;
        }
        try { await start(favoritePushWorkflow, [now.toISOString()]); }
        catch (error) { await prisma.pushScheduleRun.delete({ where: { day } }); throw error; }
        await prisma.pushScheduleRun.deleteMany({ where: { createdAt: { lt: new Date(now.getTime() - 30 * 86400000) } } });
        return Response.json({ success: true, scheduled: true }, { status: 202 });
    } catch { return Response.json({ error: 'Push scheduling unavailable' }, { status: 503 }); }
}
