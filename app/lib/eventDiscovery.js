// Shared by browser and server. IDs with accents, slashes and # round-trip losslessly.
export function eventPath(event) {
    const bytes = new TextEncoder().encode(String(event.id));
    const key = btoa(Array.from(bytes, byte => String.fromCharCode(byte)).join(''))
        .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    const slug = String(event.title || 'prova').normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80).replace(/-$/, '') || 'prova';
    return `/provas/${slug}~${key}`;
}
export function eventIdFromSlug(slug) {
    if (typeof slug !== 'string' || slug.length > 2000) return null;
    const key = slug.split('~');
    if (key.length !== 2 || !/^[a-zA-Z0-9_-]+$/.test(key[1])) return null;
    try {
        const id = new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(
            atob(key[1].replace(/-/g, '+').replace(/_/g, '/')), char => char.charCodeAt(0)));
        return id && id.length <= 1000 ? id : null;
    } catch { return null; }
}
const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
export const DISCIPLINES = [
    { slug: 'btt', name: 'BTT', intro: 'Consulta provas classificadas como BTT nas fontes reunidas pelo calendário, incluindo as especialidades indicadas em cada registo.', match: event => /^btt(?:\s|$)/.test(normalize(event.tag)) },
    { slug: 'estrada', name: 'Ciclismo de estrada', intro: 'Datas e ligações de provas classificadas como estrada. Confirma os escalões, regulamentos e condições de participação na fonte.', match: event => /^estrada(?:\s|$)/.test(normalize(event.tag)) },
    { slug: 'gravel', name: 'Gravel', intro: 'Encontra eventos classificados como gravel e consulta os detalhes publicados na origem.', match: event => normalize(event.tag) === 'gravel' },
    { slug: 'granfondos', name: 'Granfondos', intro: 'Consulta os granfondos identificados no calendário. Distâncias, preços e vagas devem ser confirmados junto da organização.', match: event => normalize(event.tag) === 'granfondo' },
    { slug: 'ciclocrosse', name: 'Ciclocrosse', intro: 'Datas de provas classificadas como ciclocrosse. Confirma o programa e as inscrições na fonte.', match: event => normalize(event.tag) === 'ciclocrosse' },
    { slug: 'pista', name: 'Ciclismo de pista', intro: 'Datas e ligações para provas classificadas como pista nas fontes disponíveis.', match: event => normalize(event.tag) === 'pista' },
    { slug: 'bmx', name: 'BMX', intro: 'Consulta as provas classificadas como BMX. Confirma a localização e as categorias na página de origem.', match: event => normalize(event.tag) === 'bmx' },
];
// Source association labels, never inferred venues or administrative regions.
export const REGIONS = [
    ['minho', 'Minho', 'AC Minho'], ['porto', 'Porto', 'AC Porto'],
    ['vila-real', 'Vila Real', 'AC Vila Real'], ['beira-alta', 'Beira Alta', 'AC Beira Alta'],
    ['beira-litoral', 'Beira Litoral', 'AC Beira Litoral'], ['beira-interior', 'Beira Interior', 'AC Beira Interior'],
    ['santarem', 'Santarém', 'AC Santarém'], ['setubal', 'Setúbal', 'AC Setúbal'],
    ['algarve', 'Algarve', 'AC Algarve'], ['madeira', 'Madeira', 'AC Madeira'], ['acores', 'Açores', 'AC Açores'],
].map(([slug, name, label]) => ({ slug, name, label,
    intro: `Provas com a classificação regional «${label}» no calendário. Esta classificação não substitui a confirmação do local exato na fonte.`,
    match: event => normalize(event.regiao) === normalize(label) }));
export function collectionPath(kind, collection) { return `/${kind}/${collection.slug}`; }
export function availableCollections(events, collections) { return collections.filter(collection => events.some(collection.match)); }
