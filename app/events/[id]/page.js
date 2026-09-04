import { prisma } from '@/app/lib/db';
import { getEventDiscipline } from '@/app/utils/eventClassifier';
import { parseScheduleServer } from '@/app/utils/scheduleParserServer';
import EventDetailClient from './EventDetailClient';
import { notFound } from 'next/navigation';

export async function generateMetadata({ params }) {
    const resolvedParams = await params;
    const rawId = resolvedParams.id;
    const id = rawId ? decodeURIComponent(rawId) : null;
    
    if (!id) return { title: 'Prova de Ciclismo | Cycling Calendar' };

    const event = await prisma.event.findUnique({
        where: { id }
    });

    if (!event) {
        return {
            title: 'Prova Não Encontrada | Cycling Calendar Portugal',
            description: 'A prova solicitada não foi encontrada no calendário oficial de ciclismo.'
        };
    }

    const title = `${event.title} (${event.date}) | Cycling Calendar Portugal`;
    const description = `Detalhes oficiais, altimetria, regulamento, inscrições e meteorologia para ${event.title} em ${event.distrito || event.details || 'Portugal'}.`;

    return {
        title,
        description,
        openGraph: {
            title: `${event.title} — ${event.date}`,
            description,
            type: 'website',
            images: event.image ? [{ url: event.image, width: 1200, height: 630, alt: event.title }] : []
        },
        twitter: {
            card: 'summary_large_image',
            title: `${event.title} (${event.date})`,
            description,
            images: event.image ? [event.image] : []
        }
    };
}

export default async function EventPage({ params }) {
    const resolvedParams = await params;
    const rawId = resolvedParams.id;
    const id = rawId ? decodeURIComponent(rawId) : null;

    if (!id) {
        notFound();
    }

    const event = await prisma.event.findUnique({
        where: { id },
        include: {
            translations: true
        }
    });

    if (!event) {
        notFound();
    }

    // Formatação de propriedades
    const formattedEvent = {
        ...event,
        sortDate: event.sortDate ? event.sortDate.toISOString() : null,
        registrationOpensAt: event.registrationOpensAt ? event.registrationOpensAt.toISOString() : null,
        registrationClosesAt: event.registrationClosesAt ? event.registrationClosesAt.toISOString() : null,
        createdAt: event.createdAt ? event.createdAt.toISOString() : null,
        updatedAt: event.updatedAt ? event.updatedAt.toISOString() : null,
        tag: getEventDiscipline(event),
        escaloes: event.escaloes ? (typeof event.escaloes === 'string' ? JSON.parse(event.escaloes) : event.escaloes) : [],
        extraLinks: event.extraLinks ? (typeof event.extraLinks === 'string' ? JSON.parse(event.extraLinks) : event.extraLinks) : [],
        parsedSchedule: parseScheduleServer(event.programa),
        gpxData: event.gpxData ? (typeof event.gpxData === 'string' ? JSON.parse(event.gpxData) : event.gpxData) : null
    };

    return <EventDetailClient event={formattedEvent} />;
}
