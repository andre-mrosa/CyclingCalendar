import CalendarView from './components/CalendarView';

export default function Home() {
    return (
        <CalendarView 
            pageTitle="Geral" 
            pageSubtitle="Todos os eventos oficiais em Portugal"
            activeFilters={['search', 'year', 'month', 'escalao', 'distrito']}
        />
    );
}
