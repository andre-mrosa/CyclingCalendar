"use client";

import CalendarView from '../components/CalendarView';
import { useTranslation } from '../i18n/useTranslation';

export default function Tacas() {
    const { t } = useTranslation();
    return (
        <CalendarView 
            pageTitle={t('page_cups_title')} 
            pageSubtitle={t('page_cups_subtitle')}
            forceAmbito="Taça de Portugal"
            activeFilters={['search', 'year', 'month', 'escalao', 'distrito']}
        />
    );
}
