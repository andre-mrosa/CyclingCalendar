import { prisma } from './lib/db';
import { SITE_URL, PUBLIC_PAGES } from './lib/seo';
export const revalidate = 3600;
export default async function sitemap() {
    const events = await prisma.event.findMany({ where: { NOT: { source: { contains: 'Quarentena' } } }, select: { id: true, updatedAt: true }, orderBy: { id: 'asc' } });
    return [...PUBLIC_PAGES.map(([path]) => ({ url: SITE_URL + path, changeFrequency: path === '/' ? 'daily' : 'weekly', priority: path === '/' ? 1 : 0.6 })), ...events.map(event => ({ url: SITE_URL + '/events/' + encodeURIComponent(event.id), lastModified: event.updatedAt, changeFrequency: 'weekly', priority: 0.7 }))];
}
