"use client";

import CalendarView from '../components/CalendarView';
import { useTranslation } from '../i18n/useTranslation';

export default function Nacionais() {
    const { t } = useTranslation();
    return (
        <CalendarView 
            pageTitle={t('page_nationals_title')} 
            pageSubtitle={t('page_nationals_subtitle')}
            forceAmbito="Nacional"
            activeFilters={['search', 'year', 'month', 'escalao', 'distrito']}
        />
    );
}
