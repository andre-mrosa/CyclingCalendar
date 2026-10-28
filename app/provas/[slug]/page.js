import Link from 'next/link';
import { notFound, permanentRedirect } from 'next/navigation';
import { getPublicEvent, getPublicCalendarEvents } from '../../lib/getPublicCalendarEvents';
import { eventIdFromSlug, eventPath, DISCIPLINES, REGIONS } from '../../lib/eventDiscovery';
import { SITE_URL, pageMetadata, eventDescription, eventPageStructuredData, jsonLd } from '../../lib/seo';
import { eventDateDisplay } from '../../utils/eventDateDisplay';
import { cleanLocation } from '../../utils/eventLocation';
export const dynamic = 'force-dynamic';
async function resolveEvent(params) {
    const { slug } = await params;
    const id = eventIdFromSlug(slug);
    const event = id && await getPublicEvent(id);
    if (!event) notFound();
    if (eventPath(event) !== '/provas/' + slug) permanentRedirect(eventPath(event));
    return event;
}
export async function generateMetadata({ params }) {
    const event = await resolveEvent(params);
    return pageMetadata(eventPath(event), `${event.title} — ${eventDateDisplay(event).start ? event.date : 'Data por confirmar'} | Cycling Calendar`, eventDescription(event));
}
export default async function EventPage({ params }) {
    const event = await resolveEvent(params);
    const dates = eventDateDisplay(event);
    const breadcrumb = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Calendário', item: SITE_URL + '/' },
        { '@type': 'ListItem', position: 2, name: event.title, item: SITE_URL + eventPath(event) },
    ] };
    const related = (await getPublicCalendarEvents()).filter(other => other.id !== event.id && event.tag && other.tag === event.tag)
        .map(other => ({ event: other, dates: eventDateDisplay(other) }))
        .filter(other => other.dates.start && dates.start && other.dates.start.slice(0, 4) === dates.start.slice(0, 4))
        .sort((a, b) => Math.abs(Date.parse(a.dates.start) - Date.parse(dates.start)) - Math.abs(Date.parse(b.dates.start) - Date.parse(dates.start)))
        .slice(0, 4);
    const fields = [
        [dates.start ? 'Data publicada' : 'Data no registo · por confirmar', event.date || 'Por confirmar'], ['Modalidade indicada', event.tag],
        ['Localização publicada', cleanLocation(event.distrito)], ['Classificação regional', event.regiao],
        ['Âmbito', event.ambito], ['Licença indicada', event.licenca],
        ['Escalões indicados', event.escaloes?.join(', ')], ['Fonte do registo', event.source],
    ].filter(([, value]) => value);
    return <article className="max-w-4xl mx-auto px-4 py-10 sm:py-16">
        <nav aria-label="Caminho da página" className="text-sm text-muted mb-8"><Link href="/" className="text-brand">Calendário</Link> / Prova</nav>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(eventPageStructuredData(event)) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(breadcrumb) }} />
        <p className="text-sm text-brand font-medium mb-3">Cycling Calendar · Informação da fonte</p>
        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-ink break-words">{event.title}</h1>
        <p className="text-muted mt-4 leading-relaxed">{dates.start ? <time dateTime={dates.start}>{event.date}</time> : 'Data por confirmar na fonte'}</p>
        {!dates.start && <p className="text-sm text-muted mt-3">Não foi possível estabelecer uma data para o calendário a partir deste registo. Confirma a informação na página de origem.</p>}
        <dl className="grid sm:grid-cols-2 gap-5 bg-surface border border-line rounded-2xl p-6 mt-8">
            {fields.map(([label, value]) => <div key={label}><dt className="text-xs text-muted mb-1">{label}</dt><dd className="text-ink break-words">{value}</dd></div>)}
        </dl>
        <section className="mt-8 space-y-4">
            <h2 className="text-xl font-semibold text-ink">Confirmar detalhes e inscrições</h2>
            <p className="text-muted leading-relaxed">Esta ficha reúne dados básicos publicados na fonte. A data e a localização podem mudar. A localização indicada não identifica necessariamente o ponto de partida. O Cycling Calendar é independente e não organiza esta prova.</p>
            <p className="text-muted leading-relaxed">Consulta a página de origem para confirmar horários, percurso, condições de participação, preço e disponibilidade de inscrições. A existência desta ficha não confirma que as inscrições estejam abertas.</p>
            <a href={event.link} target="_blank" rel="noopener noreferrer" className="inline-flex rounded-xl bg-brand text-white px-5 py-3 font-semibold">Consultar a fonte ↗</a>
            <p className="text-xs text-muted break-all">{new URL(event.link).hostname}</p>
        </section>
        <nav aria-label="Explorar provas semelhantes" className="flex flex-wrap gap-3 mt-8 text-sm text-brand">
            {DISCIPLINES.filter(item => item.match(event)).map(item => <Link key={item.slug} href={'/modalidades/' + item.slug}>Mais {item.name}</Link>)}
            {REGIONS.filter(item => item.match(event)).map(item => <Link key={item.slug} href={'/regioes/' + item.slug}>Mais provas · {item.name}</Link>)}
        </nav>
        {related.length > 0 && <section className="mt-10"><h2 className="text-xl font-semibold text-ink mb-4">Outras provas da mesma modalidade e época</h2><ul className="space-y-3">{related.map(({ event: other }) => <li key={other.id}><Link prefetch={false} href={eventPath(other)} className="text-brand">{other.title}</Link><span className="block text-sm text-muted">{other.date}</span></li>)}</ul></section>}
        <p className="text-sm text-muted mt-10">Encontraste um erro? <Link href="/contacto" className="text-brand">Envia uma correção</Link>.</p>
    </article>;
}
