import { eventDateDisplay } from '../utils/eventDateDisplay.js';
import { formatEventLocation } from '../utils/eventLocation.js';

export const SITE_URL = 'https://www.cyclingcalendar.pt';
export const SITE_TITLE = 'Cycling Calendar — Provas de ciclismo em Portugal';
export const SITE_DESCRIPTION = 'Calendário de provas de ciclismo em Portugal: estrada, BTT, gravel, BMX e cicloturismo. Consulta datas, locais e ligações para as páginas originais das provas.';
export const PUBLIC_PAGES = [
    ['/', SITE_TITLE, SITE_DESCRIPTION],
    ['/nacionais', 'Campeonatos nacionais de ciclismo | Cycling Calendar', 'Datas e informação dos campeonatos nacionais de ciclismo em Portugal.'],
    ['/internacionais', 'Provas internacionais de ciclismo | Cycling Calendar', 'Consulta as provas internacionais de ciclismo no calendário português.'],
    ['/tacas', 'Taças de ciclismo em Portugal | Cycling Calendar', 'Calendário das taças de ciclismo: datas, locais e informação das provas.'],
    ['/regionais', 'Provas regionais de ciclismo | Cycling Calendar', 'Descobre provas regionais de ciclismo e planeia a tua época.'],
    ['/lazer', 'Passeios e ciclismo de lazer | Cycling Calendar', 'Passeios, cicloturismo e provas abertas de ciclismo em Portugal.'],
    ['/ajuda', 'Ajuda | Cycling Calendar', 'Como pesquisar provas, guardar favoritos e utilizar a integração de calendário.'],
    ['/contacto', 'Contacto | Cycling Calendar', 'Contacta a equipa do Cycling Calendar para sugestões, correções ou questões sobre os teus dados.'],
    ['/privacy-policy', 'Política de Privacidade | Cycling Calendar', 'Que dados tratamos, para quê, com quem são partilhados e como exercer os teus direitos.'],
    ['/terms-of-service', 'Termos de Serviço | Cycling Calendar', 'Condições de utilização do calendário e da informação sobre provas de ciclismo.'],
];
export function pageMetadata(path, title, description) {
    const url = SITE_URL + (path === '/' ? '/' : path);
    return { title, description, alternates: { canonical: url },
        openGraph: { title, description, url, siteName: 'Cycling Calendar', locale: 'pt_PT', type: 'website', images: [{ url: SITE_URL + '/icon-512x512.png', width: 512, height: 512, alt: 'Cycling Calendar' }] },
        twitter: { card: 'summary', title, description, images: [SITE_URL + '/icon-512x512.png'] },
    };
}
export function publicImage(value) {
    if (typeof value !== 'string' || !value || value.includes('/media/events/')) return null;
    try { const url = new URL(value, SITE_URL); return /^https?:$/.test(url.protocol) && !url.username && !url.password ? url.href : null; } catch { return null; }
}
export function eventStructuredData(event) {
    const dates = eventDateDisplay(event);
    if (!dates.start) return null;
    const location = formatEventLocation(event);

    return { '@context': 'https://schema.org', '@type': 'SportsEvent', name: event.title,
        url: SITE_URL + '/events/' + encodeURIComponent(event.id), startDate: dates.start, endDate: dates.end,
        ...(location ? { location: { '@type': 'Place', name: location } } : {}),

    };
}
export const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c');
