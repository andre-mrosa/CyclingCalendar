import HomeClient from './HomeClient';
import { SITE_URL, PUBLIC_PAGES, pageMetadata, jsonLd } from './lib/seo';
export const metadata = pageMetadata(...PUBLIC_PAGES[0]);
export default function HomePage() {
    return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Cycling Calendar', url: SITE_URL + '/', inLanguage: 'pt-PT' }) }} /><HomeClient /></>;
}
