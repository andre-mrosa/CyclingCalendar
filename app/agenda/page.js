"use client";

import CalendarView from "../components/CalendarView";
import { useUser } from '@clerk/nextjs';
import { useCalendarEvents } from '../hooks/useCalendarEvents';
import { useTranslation } from '../i18n/useTranslation';
import CalendarEmptyState from '../components/CalendarEmptyState';

export default function MinhaAgenda() {
    const { t } = useTranslation();
    const { isSignedIn, isLoaded } = useUser();
    const { markedSet, isLoading } = useCalendarEvents();

    if (!isLoaded || (isSignedIn && isLoading)) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="w-8 h-8 border-4 border-line border-t-brand rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isSignedIn) return <CalendarEmptyState agenda signedOut />;

    // Contar apenas provas principais (excluindo sufixos de inscrição)
    const markedRaceCount = Array.from(markedSet).filter(id => !id.endsWith('_reg_open') && !id.endsWith('_reg_close')).length;

    if (markedRaceCount === 0) return <CalendarEmptyState agenda />;

    return (
        <CalendarView
            pageTitle={t('page_agenda_title')}
            pageSubtitle={t('page_agenda_subtitle')}
            filterByAgenda={true}
            activeFilters={['search', 'month', 'escalao', 'ambito', 'licenca', 'regiao']}
        />
    );
}
