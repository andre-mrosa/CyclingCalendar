import { SITE_URL, PUBLIC_PAGES } from './lib/seo';
export default function sitemap() {
    return PUBLIC_PAGES.map(([path]) => ({ url: SITE_URL + path, changeFrequency: path === '/' ? 'daily' : 'weekly', priority: path === '/' ? 1 : 0.6 }));
}
