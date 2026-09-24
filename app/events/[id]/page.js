import { withEventLocation } from '@/app/lib/eventLocation';
import { prisma } from '@/app/lib/db';
import { getEventDiscipline, getEventCategories } from '@/app/utils/eventClassifier';
import { parseScheduleServer } from '@/app/utils/scheduleParserServer';
import EventDetailClient from './EventDetailClient';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { sanitizeEventHtml } from '@/app/lib/sanitizeHtml';

const loadEvent = cache(async id => sanitizeEventHtml(await prisma.event.findUnique({ where: { id }, include: { translations: true } })));

export async function generateMetadata({ params }) {
    const resolvedParams = await params;
    const rawId = resolvedParams.id;
    const id = rawId ? decodeURIComponent(rawId) : null;
    
    if (!id) return { title: 'Prova de Ciclismo | Cycling Calendar' };

    const event = await loadEvent(id);

    if (!event || event.source?.includes('Quarentena')) {
        return {
            title: 'Prova Não Encontrada | Cycling Calendar Portugal',
            description: 'A prova solicitada não foi encontrada no calendário oficial de ciclismo.'
        };
    }

    const title = `${event.title} (${event.date}) | Cycling Calendar Portugal`;
    const description = `Datas, localização e informação disponível para ${event.title} em ${event.distrito || event.details || 'Portugal'}.`;

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

    const event = await loadEvent(id);

    if (!event || event.source?.includes('Quarentena')) {
        notFound();
    }

    // Formatação de propriedades com segurança contra JSON inválido
    let parsedExtraLinks = [];
    try {
        parsedExtraLinks = event.extraLinks ? (typeof event.extraLinks === 'string' ? JSON.parse(event.extraLinks) : event.extraLinks) : [];
    } catch { parsedExtraLinks = []; }

    let parsedGpxData = null;
    try {
        parsedGpxData = event.gpxData ? (typeof event.gpxData === 'string' ? JSON.parse(event.gpxData) : event.gpxData) : null;
    } catch { parsedGpxData = null; }

    const formattedEvent = {
        ...withEventLocation(event),
        sortDate: event.sortDate ? event.sortDate.toISOString() : null,
        registrationOpensAt: event.registrationOpensAt ? event.registrationOpensAt.toISOString() : null,
        registrationClosesAt: event.registrationClosesAt ? event.registrationClosesAt.toISOString() : null,
        createdAt: event.createdAt ? event.createdAt.toISOString() : null,
        updatedAt: event.updatedAt ? event.updatedAt.toISOString() : null,
        tag: getEventDiscipline(event),
        escaloes: getEventCategories(event),
        extraLinks: parsedExtraLinks,
        parsedSchedule: parseScheduleServer(event.programa),
        gpxData: parsedGpxData
    };

    return <EventDetailClient event={formattedEvent} />;
}
