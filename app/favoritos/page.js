"use client";

import CalendarView from "../components/CalendarView";
import { useUser } from '@clerk/nextjs';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from '../i18n/useTranslation';
import { FavoriteSubscription } from '../components/FavoritePlanning';
import CalendarEmptyState from '../components/CalendarEmptyState';

export default function Favoritos() {
    const { t } = useTranslation();
    const { isSignedIn, isLoaded } = useUser();
    const { favorites } = useFavorites();

    if (!isLoaded) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="w-8 h-8 border-4 border-line border-t-brand rounded-full animate-spin"></div>
            </div>
        );
    }



    if (favorites.length === 0) return <><CalendarEmptyState /><div className="mx-auto max-w-5xl px-4 pb-8"><FavoriteSubscription /></div></>;

    return (
        <CalendarView
            pageTitle={t('page_favorites_title')}
            pageSubtitle={t('page_favorites_subtitle')}
            filterByFavorites={true}
            activeFilters={['search', 'escalao', 'ambito', 'regiao']}
            applyDefaultRegiao={false}
        />
    );
}
