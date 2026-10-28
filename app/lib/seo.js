import { eventDateDisplay } from '../utils/eventDateDisplay.js';
import { formatEventLocation } from '../utils/eventLocation.js';

export const SITE_URL = 'https://www.cyclingcalendar.pt';
export const SITE_TITLE = 'Calendário de Ciclismo Portugal 2026 — BTT, Estrada, Gravel | Cycling Calendar';
export const SITE_DESCRIPTION = 'Calendário completo de provas de ciclismo em Portugal para 2026: estrada, maratonas BTT (XCM/XCO), granfondos, gravel e cicloturismo. Consulta datas oficiais, locais e inscrições.';
export const PUBLIC_PAGES = [
    ['/', SITE_TITLE, SITE_DESCRIPTION],
    ['/nacionais', 'Campeonatos Nacionais de Ciclismo 2026 em Portugal | Cycling Calendar', 'Datas e calendário oficial dos Campeonatos Nacionais de Ciclismo em Portugal 2026: estrada, contrarrelógio, BTT XCO/XCM, downhill DHI e ciclocrosse.'],
    ['/internacionais', 'Provas Internacionais de Ciclismo em Portugal 2026 | Cycling Calendar', 'Volta ao Algarve, Figueira Champions Classic, eventos UCI e provas internacionais de ciclismo realizadas em Portugal.'],
    ['/tacas', 'Taça de Portugal de Ciclismo 2026 — Calendário e Etapas | Cycling Calendar', 'Calendário das etapas da Taça de Portugal de Ciclismo 2026: Taça de Portugal de Estrada, XCO, Maratonas XCM, Downhill DHI e Ciclocrosse.'],
    ['/regionais', 'Provas Regionais de Ciclismo em Portugal 2026 | Cycling Calendar', 'Descobre provas regionais de ciclismo em Portugal das associações do Minho, Porto, Beiras, Lisboa, Alentejo, Algarve e Ilhas.'],
    ['/lazer', 'Granfondos, Meiofondos e Cicloturismo em Portugal 2026 | Cycling Calendar', 'Calendário de Granfondos, Meiofondos, passeios e ciclismo de lazer em Portugal. Planeia a tua próxima marcha desportiva.'],
    ['/ajuda', 'Ajuda | Cycling Calendar', 'Como pesquisar provas, guardar favoritos e utilizar a integração de calendário.'],
    ['/contacto', 'Contacto | Cycling Calendar', 'Contacta a equipa do Cycling Calendar para sugestões, correções ou questões sobre os teus dados.'],
    ['/privacy-policy', 'Política de Privacidade | Cycling Calendar', 'Que dados tratamos, para quê, com quem são partilhados e como exercer os teus direitos.'],
    ['/terms-of-service', 'Termos de Serviço | Cycling Calendar', 'Condições de utilização do calendário e da informação sobre provas de ciclismo.'],
];
export function pageMetadata(path, title, description) {
    const url = SITE_URL + (path === '/' ? '/' : path);
    return {
        title,
        description,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            siteName: 'Cycling Calendar',
            locale: 'pt_PT',
            type: 'website',
            images: [{
                url: SITE_URL + '/icon-512x512.png',
                width: 512,
                height: 512,
                alt: 'Cycling Calendar'
            }]
        },
        twitter: {
            card: 'summary',
            title,
            description,
            images: [SITE_URL + '/icon-512x512.png']
        },
    };
}
export function publicImage(value) {
    if (typeof value !== 'string' || !value || value.includes('/media/events/')) return null;
    try { const url = new URL(value, SITE_URL); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function eventStructuredData(event) {
    const dates = eventDateDisplay(event);
    if (!dates.start) return null;
    const rawLocation = formatEventLocation(event);
    const locationName = rawLocation || event.distrito || event.regiao || 'Portugal';
    const locationRegion = event.distrito || event.regiao || 'Portugal';
    const publicImg = publicImage(event.image);
    const image = publicImg ? [publicImg] : (event.image ? undefined : [SITE_URL + '/icon-512x512.png']);
    const eventUrl = SITE_URL + '/events/' + encodeURIComponent(event.id);

    const description = `${event.title} - Prova de ciclismo${event.tag ? ` (${event.tag})` : ''} em ${locationName}, Portugal. Data: ${dates.start}${dates.end && dates.end !== dates.start ? ` a ${dates.end}` : ''}. Consulta informação oficial no Cycling Calendar.`;

    const data = {
        '@context': 'https://schema.org',
        '@type': 'SportsEvent',
        name: event.title,
        description,
        url: eventUrl,
        startDate: dates.start,
        endDate: dates.end || dates.start,
        location: {
            '@type': 'Place',
            name: locationName,
            address: {
                '@type': 'PostalAddress',
                addressCountry: 'PT',
                addressRegion: locationRegion,
            },
        },
        sport: event.tag || 'Cycling',
        eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
        eventStatus: 'https://schema.org/EventScheduled',
        organizer: {
            '@type': 'Organization',
            name: event.source || 'Federação Portuguesa de Ciclismo',
            url: SITE_URL,
        },
        performer: {
            '@type': 'PerformingGroup',
            name: 'Atletas e Participantes',
        },
        offers: {
            '@type': 'Offer',
            url: eventUrl,
            price: '0',
            priceCurrency: 'EUR',
            availability: 'https://schema.org/InStock',
            validFrom: dates.start,
        },
    };

    if (image) {
        data.image = image;
    }

    return data;
}
export function filterUpcomingEvents(events, limit = 40) {
    const now = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    return (events || [])
        .filter(event => (event.sortDate && event.sortDate >= now) || (!event.sortDate && event.date))
        .slice(0, limit);
}
export const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c');
