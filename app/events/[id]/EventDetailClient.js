'use client';
import Link from 'next/link';
import { useMemo } from 'react';
import { ChevronLeft } from 'lucide-react';
import EventModal from '@/app/components/EventModal';
import { useFavorites } from '@/app/hooks/useFavorites';
import { useTranslation } from '@/app/i18n/useTranslation';

export default function EventDetailClient({ event }) {
    const { favorites, toggleFavorite, isSignedIn } = useFavorites();
    const { t } = useTranslation();
    const fullEvent = useMemo(() => ({ ...event, _hasFullDetails: true }), [event]);
    return <main className="max-w-5xl mx-auto px-3 sm:px-5 py-5">
        <nav className="flex flex-wrap items-center justify-between gap-4" aria-label={t('nav_calendar')}>
            <Link href="/" aria-label="Cycling Calendar"><img src="/brand-final.png?v=1.0.0-3" alt="" width={38} height={38} /></Link>
            <Link href="/" className="flex items-center gap-1 text-sm text-muted hover:text-brand"><ChevronLeft size={16} />{t('nav_calendar')}</Link>
        </nav>
        <EventModal selectedEvent={fullEvent} favorites={favorites} toggleFavorite={toggleFavorite} isSignedIn={isSignedIn} standalone />
    </main>;
}
