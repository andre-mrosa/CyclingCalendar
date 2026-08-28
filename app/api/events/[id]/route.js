import { prisma } from '@/app/lib/db';
import { getEventDiscipline } from '@/app/utils/eventClassifier';

export async function GET(request, { params }) {
    try {
        const resolvedParams = await params;
        const id = resolvedParams.id;
        
        if (!id) {
            return Response.json({ success: false, error: 'ID is required' }, { status: 400 });
        }

        const event = await prisma.event.findUnique({
            where: { id },
            include: {
                translations: true
            }
        });

        if (!event) {
            return Response.json({ success: false, error: 'Event not found' }, { status: 404 });
        }

        // Convert stringified arrays back to arrays for frontend
        const formattedEvent = {
            ...event,
            tag: getEventDiscipline(event),
            escaloes: event.escaloes ? (typeof event.escaloes === 'string' ? JSON.parse(event.escaloes) : event.escaloes) : [],
            extraLinks: event.extraLinks ? (typeof event.extraLinks === 'string' ? JSON.parse(event.extraLinks) : event.extraLinks) : []
        };

        return Response.json(
            { success: true, event: formattedEvent },
            {
                headers: {
                    'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=600'
                }
            }
        );

    } catch (error) {
        console.error('Error fetching single event:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
