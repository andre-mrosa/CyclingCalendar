import CalendarView from '../components/CalendarView';

export default function Lazer() {
    return (
        <CalendarView 
            pageTitle="Passeios e Lazer" 
            pageSubtitle="Granfondos e Provas Abertas"
            forceLicenca="CPT / Lazer"
            activeFilters={['search', 'year', 'month', 'distrito', 'modalidade']}
        />
    );
}
