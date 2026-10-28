import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicCalendarEvents } from '../lib/getPublicCalendarEvents';
import { DISCIPLINES, REGIONS, eventPath, collectionPath } from '../lib/eventDiscovery';
import { eventDateDisplay } from '../utils/eventDateDisplay';
import { lisbonWallClock } from '../utils/planning';
import { pageMetadata, itemListStructuredData, jsonLd } from '../lib/seo';

const PAGE_SIZE = 60;
export async function loadCollection(kind, params, searchParams) {
    const { slug } = await params;
    const collection = (kind === 'modalidades' ? DISCIPLINES : REGIONS).find(item => item.slug === slug);
    if (!collection) notFound();
    const query = await searchParams || {};
    const raw = query.pagina || '1';
    if (typeof raw !== 'string' || !/^[1-9]\d{0,3}$/.test(raw)) notFound();
    const page = Number(raw);
    const today = lisbonWallClock().slice(0, 10);
    const events = (await getPublicCalendarEvents()).filter(collection.match).map(event => ({ event, dates: eventDateDisplay(event) }));
    // Upcoming first, then the most recent archive. Undated records follow.
    events.sort((a, b) => {
        const group = item => !item.dates.start ? 2 : (item.dates.end || item.dates.start) >= today ? 0 : 1;
        const diff = group(a) - group(b);
        return diff || (group(a) === 1 ? (b.dates.start || '').localeCompare(a.dates.start || '') : (a.dates.start || '').localeCompare(b.dates.start || '')) || a.event.title.localeCompare(b.event.title, 'pt');
    });
    const pages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
    if (page > pages) notFound();
    return { collection, page, pages, count: events.length, path: collectionPath(kind, collection),
        events: events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(item => item.event), kind, today };
}
export function collectionMetadata(data) {
    const { collection, path, page, count } = data;
    const title = `${collection.name} — Calendário de provas${page > 1 ? ` · Página ${page}` : ''} | Cycling Calendar`;
    return { ...pageMetadata(path + (page > 1 ? '?pagina=' + page : ''), title, collection.intro),
        ...(!count ? { robots: { index: false, follow: true } } : {}) };
}
export default function DiscoveryCollection({ data }) {
    const { collection, page, pages, count, path, events, today } = data;
    const href = number => path + (number > 1 ? '?pagina=' + number : '');
    return <article className="max-w-5xl mx-auto px-4 py-10 sm:py-16">
        <nav aria-label="Caminho da página" className="text-sm text-muted mb-8"><Link href="/" className="text-brand">Calendário</Link> / {collection.name}</nav>
        <h1 className="text-3xl sm:text-4xl font-bold text-ink">Calendário de provas · {collection.name}</h1>
        <p className="mt-4 text-muted leading-relaxed max-w-3xl">{collection.intro}</p>
        <p className="mt-3 text-sm text-muted">As próximas datas aparecem primeiro, seguidas do arquivo. Não garantimos cobertura completa. Confirma alterações na fonte.</p>
        <h2 className="mt-9 mb-4 text-xl font-semibold text-ink">Registos do calendário <span className="text-muted font-normal">({count})</span></h2>
        {events.length > 0 ? <>
            <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(itemListStructuredData(events, collection.name)) }} />
            <ul className="space-y-3">{events.map(event => {
                const dates = eventDateDisplay(event);
                const past = dates.end && dates.end < today;
                return <li key={event.id} className="bg-surface border border-line rounded-xl p-5">
                    <p className="text-xs text-muted mb-2">{past ? 'Arquivo · ' : ''}{dates.start ? <time dateTime={dates.start}>{event.date}</time> : 'Data por confirmar na fonte'}</p>
                    <h3 className="text-lg font-semibold"><Link prefetch={false} href={eventPath(event)} className="text-brand break-words">{event.title}</Link></h3>
                    <p className="text-sm text-muted mt-2">{[event.tag, event.distrito, event.source].filter(Boolean).join(' · ')}</p>
                </li>;
            })}</ul>
        </> : <p className="text-muted">Não há registos disponíveis para esta classificação. Consulta o <Link href="/" className="text-brand">calendário geral</Link>.</p>}
        {pages > 1 && <nav aria-label="Paginação das provas" className="flex flex-wrap justify-between items-center gap-4 mt-8 text-brand">
            {page > 1 ? <Link href={href(page - 1)} rel="prev">← Anterior</Link> : <span />}
            <span className="text-sm text-muted">Página {page} de {pages}</span>
            {page < pages && <Link href={href(page + 1)} rel="next">Seguinte →</Link>}
        </nav>}
        <p className="text-sm text-muted mt-10">Falta uma prova ou há um erro? <Link href="/contacto" className="text-brand">Envia uma sugestão</Link>.</p>
    </article>;
}
