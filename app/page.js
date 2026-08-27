'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from './store/useSettingsStore';
import CalendarView from './components/CalendarView';

export default function Home() {
    const router = useRouter();
    const { defaultPage } = useSettingsStore();
    const [isRedirecting, setIsRedirecting] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const settings = localStorage.getItem('cycling-calendar-settings');
                if (settings) {
                    const parsed = JSON.parse(settings);
                    const def = parsed?.state?.defaultPage;
                    if (def && def !== '/') {
                        const hasRedirected = sessionStorage.getItem('initial_home_redirect_done');
                        if (!hasRedirected) return true;
                    }
                }
            } catch (e) {}
        }
        return false;
    });

    useEffect(() => {
        if (typeof window !== 'undefined') {
            const hasRedirected = sessionStorage.getItem('initial_home_redirect_done');
            if (!hasRedirected && defaultPage && defaultPage !== '/') {
                sessionStorage.setItem('initial_home_redirect_done', 'true');
                router.replace(defaultPage);
            } else if (isRedirecting) {
                setIsRedirecting(false);
            }
        }
    }, [defaultPage, router, isRedirecting]);

    if (isRedirecting) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-200" />
        );
    }

    return (
        <CalendarView 
            pageTitle="Geral" 
            pageSubtitle="Todos os eventos oficiais em Portugal"
            activeFilters={['search', 'year', 'month', 'escalao', 'distrito']}
        />
    );
}
