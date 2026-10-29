"use client";

import CalendarView from '../components/CalendarView';
import { useTranslation } from '../i18n/useTranslation';

export default function InternacionaisClient({ initialEvents, archiveYear, defaultYears, defaultPastEventsFilter }) {
    const { t } = useTranslation();
    return (
        <CalendarView 
            pageTitle={t('page_internationals_title')} 
            pageSubtitle={t('page_internationals_subtitle')}
            forceAmbito="Internacional"
            activeFilters={['search', 'year', 'month', 'distrito', 'modalidade']}
            initialEvents={initialEvents}
            defaultYears={defaultYears}
            defaultPastEventsFilter={defaultPastEventsFilter}
            pageIntro={archiveYear ? <aside className="mb-6 rounded-xl border border-line bg-surface p-5">
                <h2 className="font-semibold text-ink">{t('page_internationals_archive_title')}</h2>
                <p className="mt-2 text-sm text-muted leading-relaxed">{t('page_internationals_archive_desc', { year: archiveYear })}</p>
            </aside> : null}
        />
    );
}
