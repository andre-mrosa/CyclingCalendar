import { prisma } from '@/app/lib/db';
import { PUBLIC_EVENT_SELECT, toPublicEvent } from '@/app/lib/publicEvent';
export async function GET(_request, { params }) {
    const { id } = await params;
    try {
        const event = toPublicEvent(await prisma.event.findUnique({ where: { id }, select: PUBLIC_EVENT_SELECT }));
        return Response.json(event ? { success: true, event } : { success: false, error: 'Event not found' },
            { status: event ? 200 : 404, headers: { 'Cache-Control': 'no-store' } });
    } catch {
        return Response.json({ success: false, error: 'Events temporarily unavailable' }, { status: 503 });
    }
}
