import DiscoveryCollection, { loadCollection, collectionMetadata } from '../../components/DiscoveryCollection';
export const dynamic = 'force-dynamic';
export async function generateMetadata({ params, searchParams }) {
    return collectionMetadata(await loadCollection('modalidades', params, searchParams));
}
export default async function Page({ params, searchParams }) {
    return <DiscoveryCollection data={await loadCollection('modalidades', params, searchParams)} />;
}
