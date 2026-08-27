import CalendarView from '../components/CalendarView';

export const metadata = {
    title: 'Modo Offline | Cycling Calendar',
};

export default function OfflinePage() {
    return (
        <CalendarView 
            pageTitle="Geral (Offline)" 
            pageSubtitle="Modo Offline — Acesso aos eventos guardados no dispositivo" 
            activeFilters={['search', 'year', 'month', 'escalao', 'distrito']} 
        />
    );
}
