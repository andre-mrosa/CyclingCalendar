"use client";

import CalendarView from '../components/CalendarView';
import { useTranslation } from '../i18n/useTranslation';

export default function Internacionais() {
    const { t } = useTranslation();
    return (
        <CalendarView 
            pageTitle={t('page_internationals_title')} 
            pageSubtitle={t('page_internationals_subtitle')}
            forceEscalao="Profissional (UCI)"
            activeFilters={['search', 'year', 'month', 'distrito']}
        />
    );
}
