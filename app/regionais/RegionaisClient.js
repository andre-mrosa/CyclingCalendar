"use client";

import CalendarView from '../components/CalendarView';
import { useTranslation } from '../i18n/useTranslation';

export default function RegionaisClient({ initialEvents }) {
    const { t } = useTranslation();
    return (
        <CalendarView 
            pageTitle={t('page_regionals_title')} 
            pageSubtitle={t('page_regionals_subtitle')}
            forceAmbito="Regional"
            activeFilters={['search', 'year', 'month', 'escalao', 'regiao', 'modalidade']}
            applyDefaultRegiao={true}
            initialEvents={initialEvents}
        />
    );
}
