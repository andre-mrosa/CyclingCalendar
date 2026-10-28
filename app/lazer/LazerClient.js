"use client";

import CalendarView from '../components/CalendarView';
import { useTranslation } from '../i18n/useTranslation';

export default function LazerClient({ initialEvents }) {
    const { t } = useTranslation();
    return (
        <CalendarView 
            pageTitle={t('page_leisure_title')} 
            pageSubtitle={t('page_leisure_subtitle')}
            forceLicenca="CPT / Lazer"
            activeFilters={['search', 'year', 'month', 'distrito', 'modalidade']}
            initialEvents={initialEvents}
        />
    );
}
