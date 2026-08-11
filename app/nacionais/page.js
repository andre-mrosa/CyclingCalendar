import CalendarView from '../components/CalendarView';

export default function Nacionais() {
    return (
        <CalendarView 
            pageTitle="Campeonatos Nacionais" 
            pageSubtitle="Apenas a elite e campeonatos nacionais"
            forceAmbito="Nacional"
        />
    );
}
