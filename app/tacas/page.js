import CalendarView from '../components/CalendarView';

export default function Tacas() {
    return (
        <CalendarView 
            pageTitle="Taças de Portugal" 
            pageSubtitle="Competições a pontuar para a Taça"
            forceAmbito="Taça de Portugal"
            activeFilters={['search', 'year', 'month', 'escalao', 'distrito']}
        />
    );
}
