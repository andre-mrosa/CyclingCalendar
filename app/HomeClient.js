'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from './store/useSettingsStore';
import { useTranslation } from './i18n/useTranslation';
import CalendarView from './components/CalendarView';

export default function Home() {
    const { t } = useTranslation();
    const router = useRouter();
    const { defaultPage } = useSettingsStore();
    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasRedirected = sessionStorage.getItem('initial_home_redirect_done');
            if (!new URLSearchParams(window.location.search).has('filters') && !new URLSearchParams(window.location.search).has('event') && !hasRedirected && defaultPage && defaultPage !== '/') {
                sessionStorage.setItem('initial_home_redirect_done', 'true');
                router.replace(defaultPage);
            }
        }
    }, [defaultPage, router]);

    return (
        <CalendarView
            pageTitle={t('page_home_title')}
            pageSubtitle={t('page_home_subtitle')}
            activeFilters={['search', 'year', 'month', 'escalao', 'distrito']}
        />
    );
}
