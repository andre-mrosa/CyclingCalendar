import { prisma } from '@/app/lib/db';
import { originalEventUrl } from '@/app/lib/publicEvent';
import { notFound, redirect } from 'next/navigation';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Página original da prova', robots: { index: false, follow: false } };
export default async function EventPage({ params }) {
    const { id } = await params;
    const event = await prisma.event.findUnique({ where: { id }, select: { link: true, source: true } });
    const link = event && !event.source.includes('Quarentena') && originalEventUrl(event.link);
    if (!link) notFound();
    redirect(link);
}
