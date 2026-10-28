import { eventDateDisplay } from '../utils/eventDateDisplay.js';
import { eventPath } from './eventDiscovery.js';
import { lisbonWallClock } from '../utils/planning.js';

export const SITE_URL = 'https://www.cyclingcalendar.pt';
export const SITE_TITLE = 'Calendário de Ciclismo em Portugal — BTT, Estrada e Gravel | Cycling Calendar';
export const SITE_DESCRIPTION = 'Consulta datas, modalidades e localizações publicadas de provas de ciclismo: BTT, estrada, gravel e granfondos. Calendário independente com ligações às fontes.';
export const PUBLIC_PAGES = [
    ['/', SITE_TITLE, SITE_DESCRIPTION],
    ['/nacionais', 'Campeonatos Nacionais de Ciclismo | Cycling Calendar', 'Consulta as provas identificadas como Campeonatos Nacionais no calendário de ciclismo, com datas e ligações às fontes.'],
    ['/internacionais', 'Provas Internacionais de Ciclismo | Cycling Calendar', 'Consulta as provas classificadas como internacionais nas fontes reunidas pelo calendário. Confirma os detalhes na página de origem.'],
    ['/tacas', 'Taça de Portugal de Ciclismo — Calendário | Cycling Calendar', 'Datas e ligações para as provas classificadas como Taça de Portugal no calendário de ciclismo.'],
    ['/regionais', 'Provas Regionais de Ciclismo | Cycling Calendar', 'Consulta provas classificadas como regionais e filtra pela associação indicada nas fontes do calendário.'],
    ['/lazer', 'Granfondos, Passeios e Ciclismo de Lazer | Cycling Calendar', 'Consulta provas classificadas como lazer, passeios e granfondos. Confirma as condições de participação na fonte.'],
    ['/ajuda', 'Ajuda | Cycling Calendar', 'Como pesquisar provas, consultar fontes, guardar favoritos e exportar datas para o calendário.'],
    ['/contacto', 'Contacto | Cycling Calendar', 'Envia sugestões, correções de provas ou questões sobre os teus dados ao Cycling Calendar.'],
    ['/privacy-policy', 'Política de Privacidade | Cycling Calendar', 'Que dados tratamos, para quê, com quem são partilhados e como exercer os teus direitos.'],
    ['/terms-of-service', 'Termos de Serviço | Cycling Calendar', 'Condições de utilização do calendário e da informação sobre provas de ciclismo.'],
];
export function pageMetadata(path, title, description) {
    const url = SITE_URL + path;
    return { title, description, alternates: { canonical: url },
        openGraph: { title, description, url, siteName: 'Cycling Calendar', locale: 'pt_PT', type: 'website',
            images: [{ url: SITE_URL + '/icon-512x512.png', width: 512, height: 512, alt: 'Cycling Calendar' }] },
        twitter: { card: 'summary', title, description, images: [SITE_URL + '/icon-512x512.png'] } };
}
export function eventDescription(event) {
    const date = eventDateDisplay(event).start ? event.date : 'por confirmar na fonte';
    return `${event.title}. Data publicada: ${date}.${event.tag ? ` Modalidade indicada: ${event.tag}.` : ''} Consulta a fonte para confirmar local, inscrições e eventuais alterações.`;
}
// The catalogue has basic facts, not verified venues, ticket offers or event images.
// Describe the actual page without claiming Event rich result eligibility.
export function eventPageStructuredData(event) {
    return { '@context': 'https://schema.org', '@type': 'WebPage',
        name: event.title, url: SITE_URL + eventPath(event), description: eventDescription(event), inLanguage: 'pt-PT' };
}
export function itemListStructuredData(events, name) {
    return { '@context': 'https://schema.org', '@type': 'ItemList', name,
        itemListElement: events.map((event, index) => ({ '@type': 'ListItem', position: index + 1,
            name: event.title, url: SITE_URL + eventPath(event) })) };
}
export function filterUpcomingEvents(events, limit = 40, today = lisbonWallClock().slice(0, 10)) {
    return (events || []).map(event => ({ event, dates: eventDateDisplay(event) }))
        .filter(({ dates }) => dates.start && (dates.end || dates.start) >= today)
        .sort((a, b) => a.dates.start.localeCompare(b.dates.start) || a.event.title.localeCompare(b.event.title, 'pt'))
        .slice(0, limit).map(({ event }) => event);
}
export const jsonLd = value => JSON.stringify(value).replace(/</g, '\\u003c');
