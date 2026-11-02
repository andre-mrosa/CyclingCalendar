import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getPublicCalendarEvents } from '../lib/getPublicCalendarEvents';
import { DISCIPLINES, REGIONS, eventPath, collectionPath } from '../lib/eventDiscovery';
import { eventDateDisplay } from '../utils/eventDateDisplay';
import { lisbonWallClock } from '../utils/planning';
import { pageMetadata, itemListStructuredData, jsonLd } from '../lib/seo';
import {monthCollection,availableMonths} from '../lib/calendarMonths';
import {mergeEvents} from '../utils/mergeEvents';

const PAGE_SIZE = 60;
export async function loadCollection(kind, params, searchParams) {
    const { slug } = await params;
    const base = kind==='meses'?monthCollection(slug):(kind === 'modalidades' ? DISCIPLINES : REGIONS).find(item => item.slug === slug);
    if(!base)notFound();
    const query = await searchParams || {};
    const facets=[];
    for(const [key,choices] of [['modalidade',DISCIPLINES],['regiao',REGIONS]])if(query[key]){const facet=choices.find(item=>item.slug===query[key]);if(!facet)notFound();facets.push([key,facet]);}
    if(query.mes){const facet=monthCollection(query.mes);if(!facet||kind==='meses')notFound();facets.push(['mes',facet]);}
    const collection={...base,name:[base.name,...facets.map(([,item])=>item.name)].join(' · '),intro:base.intro+(facets.length?' Seleção adicional: '+facets.map(([key,item])=>key==='regiao'?`classificação regional ${item.label}`:item.name).join('; ')+'.':'')};
    if (!collection) notFound();
    const raw = query.pagina || '1';
    if (typeof raw !== 'string' || !/^[1-9]\d{0,3}$/.test(raw)) notFound();
    const page = Number(raw);
    const today = lisbonWallClock().slice(0, 10);
    const collectionEvents=mergeEvents(await getPublicCalendarEvents()).filter(base.match);
    const matching=collectionEvents.filter(event=>facets.every(([,item])=>item.match(event)));
    const events = matching.map(event => ({ event, dates: eventDateDisplay(event) }));
    // Upcoming first, then the most recent archive. Undated records follow.
    events.sort((a, b) => {
        const group = item => !item.dates.start ? 2 : (item.dates.end || item.dates.start) >= today ? 0 : 1;
        const diff = group(a) - group(b);
        return diff || (group(a) === 1 ? (b.dates.start || '').localeCompare(a.dates.start || '') : (a.dates.start || '').localeCompare(b.dates.start || '')) || a.event.title.localeCompare(b.event.title, 'pt');
    });
    const pages = Math.max(1, Math.ceil(events.length / PAGE_SIZE));
    if (page > pages) notFound();
    const facetQuery=new URLSearchParams(facets.map(([key,item])=>[key,item.slug]));
    const path=collectionPath(kind,base),suffix=facetQuery.toString();
    const otherMonths=collectionEvents.filter(event=>facets.filter(([key])=>key!=='mes').every(([,item])=>item.match(event)));
    const months=kind==='meses'?[]:availableMonths(otherMonths,today).map(item=>{const q=new URLSearchParams(facetQuery);q.set('mes',item.slug);return {...item,href:path+'?'+q};});
    return { collection, page, pages, count: events.length, path,suffix,months,
        events: events.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE).map(item => item.event), kind, today };
}
export function collectionMetadata(data) {
    const { collection, path, page, count,suffix } = data;
    const title = `${collection.name} — Calendário de provas${page > 1 ? ` · Página ${page}` : ''} | Cycling Calendar`;
    const query=new URLSearchParams(suffix);if(page>1)query.set('pagina',String(page));
    return { ...pageMetadata(path + (query.size ? '?'+query : ''), title, collection.intro),
        ...(!count ? { robots: { index: false, follow: true } } : {}) };
}
export default function DiscoveryCollection({ data }) {
    const { collection, page, pages, count, path, events, today,suffix,months=[] } = data;
    const href = number => {const q=new URLSearchParams(suffix);if(number>1)q.set('pagina',String(number));return path+(q.size?'?'+q:'');};
    return <article className="max-w-5xl mx-auto px-4 py-10 sm:py-16">
        <nav aria-label="Caminho da página" className="text-sm text-muted mb-8"><Link href="/" className="text-brand">Calendário</Link> / {collection.name}</nav>
        <h1 className="text-3xl sm:text-4xl font-bold text-ink">Calendário de provas · {collection.name}</h1>
        <p className="mt-4 text-muted leading-relaxed max-w-3xl">{collection.intro}</p>
        <p className="mt-3 text-sm text-muted">As próximas datas aparecem primeiro, seguidas do arquivo. Não garantimos cobertura completa. Confirma alterações na fonte.</p>
        {!!months.length&&<nav aria-label="Explorar por mês" className="mt-5 flex flex-wrap gap-3 text-sm text-brand">{months.map(item=><Link key={item.slug} href={item.href}>{item.name}</Link>)}</nav>}
        <p className="mt-3 text-sm"><Link href="/calendarios" className="text-brand">Explorar modalidades, classificações regionais e meses →</Link></p>
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
