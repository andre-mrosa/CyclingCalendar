'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useSettingsStore } from './store/useSettingsStore';
import CalendarView from './components/CalendarView';

export default function Home() {
    const router = useRouter();
    const { defaultPage } = useSettingsStore();
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        if (typeof window !== 'undefined' && defaultPage && defaultPage !== '/') {
            const hasRedirected = sessionStorage.getItem('initial_home_redirect_done');
            if (!hasRedirected) {
                sessionStorage.setItem('initial_home_redirect_done', 'true');
                router.replace(defaultPage);
            }
        }
    }, [defaultPage, router]);

    return (
        <CalendarView 
            pageTitle="Geral" 
            pageSubtitle="Todos os eventos oficiais em Portugal"
            activeFilters={['search', 'year', 'month', 'escalao', 'distrito']}
        />
    );
}
