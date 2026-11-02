import Link from 'next/link';
import {getPublicCalendarEvents} from '../lib/getPublicCalendarEvents';
import {DISCIPLINES,REGIONS,availableCollections,collectionPath} from '../lib/eventDiscovery';
import {availableMonths} from '../lib/calendarMonths';
import {mergeEvents} from '../utils/mergeEvents';
import {pageMetadata} from '../lib/seo';
export const dynamic='force-dynamic';
export const metadata=pageMetadata('/calendarios','Explorar calendários de ciclismo por modalidade e mês | Cycling Calendar','Encontra provas por modalidade, classificação regional e mês, com datas publicadas e ligações às fontes.');
export default async function Page(){
    const events=mergeEvents(await getPublicCalendarEvents());
    const groups=[['Por modalidade','modalidades',availableCollections(events,DISCIPLINES)],['Por classificação regional','regioes',availableCollections(events,REGIONS)],['Por mês','meses',availableMonths(events)]];
    return <article className="max-w-5xl mx-auto px-4 py-10"><h1 className="text-3xl font-bold">Explorar calendários de ciclismo</h1><p className="mt-4 text-muted">Escolhe uma modalidade ou um mês para consultar datas publicadas. Nas páginas de modalidade e classificação regional podes também escolher um mês.</p><p className="mt-3 text-sm text-muted">As classificações regionais correspondem às associações indicadas na fonte; não confirmam o local da prova. A ficha de cada prova liga à origem para verificar o programa, os escalões e as inscrições.</p>{groups.map(([title,kind,items])=><section key={kind} className="mt-8"><h2 className="text-xl font-semibold">{title}</h2><ul className="mt-4 grid sm:grid-cols-2 gap-3">{items.map(item=><li key={item.slug}><Link className="block rounded-xl border border-line bg-surface p-4 text-brand" href={collectionPath(kind,item)}>{item.name}<span className="text-muted text-sm ml-2">({events.filter(item.match).length})</span></Link></li>)}</ul>{!items.length&&<p className="mt-3 text-muted">Sem registos disponíveis nesta seleção.</p>}</section>)}</article>;
}
