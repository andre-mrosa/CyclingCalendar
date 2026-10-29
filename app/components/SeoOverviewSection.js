import { DISCIPLINES, REGIONS, availableCollections } from '../lib/eventDiscovery';
import SeoOverviewClient from './SeoOverviewClient';

export default function SeoOverviewSection({ events = [] }) {
    const links = collections => availableCollections(events, collections).map(({slug,name}) => ({slug,name}));
    return <SeoOverviewClient disciplines={links(DISCIPLINES)} regions={links(REGIONS)} />;
}
