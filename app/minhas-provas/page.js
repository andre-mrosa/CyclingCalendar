'use client';
import CalendarView from '../components/CalendarView';
import { useTranslation } from '../i18n/useTranslation';
import { myEventsText } from '../i18n/myEventsCopy';
import { interfaceText } from '../i18n/interfaceCopy';

export default function MyEventsPage() {
    const { language } = useTranslation();
    return <CalendarView personal pageTitle={myEventsText(language, 'title')} pageSubtitle={interfaceText(language, 'personalIntro')}
        activeFilters={['search', 'year', 'month', 'escalao', 'ambito', 'regiao']} defaultPastEventsFilter="futuros" />;
}
