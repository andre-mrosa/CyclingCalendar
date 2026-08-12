import CalendarView from '../components/CalendarView';

export default function Internacionais() {
    return (
        <CalendarView 
            pageTitle="Provas Internacionais" 
            pageSubtitle="Eventos UCI e Pro (acesso restrito)"
            forceEscalao="Profissional (UCI)"
            activeFilters={['search', 'year', 'month', 'distrito']}
        />
    );
}
