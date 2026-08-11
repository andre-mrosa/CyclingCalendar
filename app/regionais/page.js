import CalendarView from '../components/CalendarView';

export default function Regionais() {
    return (
        <CalendarView 
            pageTitle="Provas Regionais" 
            pageSubtitle="Competições organizadas pelas Associações Regionais"
            forceAmbito="Regional"
        />
    );
}
