"use client";

import CalendarView from "../components/CalendarView";
import { useUser } from '@clerk/nextjs';
import { CalendarCheck } from 'lucide-react';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useTranslation } from '../i18n/useTranslation';
import Link from 'next/link';

export default function MinhaAgenda() {
    const { t } = useTranslation();
    const { isSignedIn, isLoaded } = useUser();
    const { markedSet, isLoading } = useCalendarEvents();

    if (!isLoaded || (isSignedIn && isLoading)) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="w-8 h-8 border-4 border-slate-700 border-t-emerald-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="max-w-xl mx-auto py-16 px-4 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                    <CalendarCheck size={32} className="text-emerald-500 dark:text-emerald-400 opacity-80" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">{t('page_agenda_title')}</h1>
                <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-6">
                    {t('page_agenda_signin_desc')}
                </p>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl inline-block shadow-sm">
                    <p className="text-sm text-emerald-600 dark:text-emerald-400 font-semibold m-0">
                        {t('page_agenda_signin_btn')}
                    </p>
                </div>
            </div>
        );
    }

    // Contar apenas provas principais (excluindo sufixos de inscrição)
    const markedRaceCount = Array.from(markedSet).filter(id => !id.endsWith('_reg_open') && !id.endsWith('_reg_close')).length;

    if (markedRaceCount === 0) {
        return (
            <div className="max-w-xl mx-auto py-16 px-4 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-6">
                    <CalendarCheck size={32} className="text-emerald-500 dark:text-emerald-400" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">{t('page_agenda_empty_title')}</h1>
                <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8">
                    {t('page_agenda_empty_desc')}
                </p>
                <Link href="/" className="inline-flex items-center justify-center px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-emerald-500/20">
                    {t('page_favorites_explore_btn')}
                </Link>
            </div>
        );
    }

    return (
        <CalendarView 
            pageTitle={t('page_agenda_title')}
            pageSubtitle={t('page_agenda_subtitle')}
            filterByAgenda={true}
            activeFilters={['search', 'month', 'escalao', 'ambito', 'licenca', 'regiao']}
        />
    );
}
