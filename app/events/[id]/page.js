import { pageMetadata, publicImage, eventStructuredData, jsonLd } from '@/app/lib/seo';
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
    const id = rawId || null;
    
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

    const meta = pageMetadata('/events/' + encodeURIComponent(event.id), title, description);
    const image = publicImage(event.image);
    if (image) {
        meta.openGraph.images = [{ url: image, alt: event.title }];
        meta.twitter.images = [image];
        meta.twitter.card = 'summary_large_image';
    }
    return meta;
}

export default async function EventPage({ params }) {
    const resolvedParams = await params;
    const rawId = resolvedParams.id;
    const id = rawId || null;

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
        parsedSchedule: parseScheduleServer(event.programContent ?? event.programa),
        gpxData: parsedGpxData
    };

    const structured = eventStructuredData(event);
    return <>{structured && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(structured) }} />}<EventDetailClient event={formattedEvent} /></>;
}
