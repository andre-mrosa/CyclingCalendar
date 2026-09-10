import { useTranslation } from '../i18n/useTranslation';

const steps = {
    pt: [
        ['Encontrar uma prova', 'Pesquisa pelo nome ou localidade. Usa a modalidade, o distrito e os atalhos “Este fim de semana” ou “Este mês” para reduzir a lista.'],
        ['Guardar ou marcar?', 'A estrela guarda uma prova nos Favoritos. “Adicionar ao calendário” reserva as datas no teu calendário. Nenhuma destas ações faz a inscrição na prova.'],
        ['Google Calendar', 'Podes abrir um evento para o guardar manualmente no Google. Se ligares a tua conta, podes adicionar e remover marcações através do site e consultá-las na Minha Agenda.'],
        ['Apple, Outlook e lembretes', 'Importa o ficheiro .ics no teu calendário. Inclui um aviso na véspera. Na exportação manual para Google, confirma os avisos antes de guardar. A integração Google cria avisos uma semana e dois dias antes da prova.'],
        ['Inscrições e alterações', 'Quando existem datas de abertura e fecho, a ficha permite criar lembretes separados. Confirma inscrição, partida e eventuais alterações na organização. Os ficheiros exportados não atualizam automaticamente quando a prova muda.'],
    ],
    en: [
        ['Find an event', 'Search by name or town. Narrow the list by discipline, district, this weekend or this month.'],
        ['Save or schedule?', 'The star saves an event to Favorites. “Add to calendar” reserves its dates. Neither action registers you for the event.'],
        ['Google Calendar', 'Open an event to save it manually in Google. With a connected account, you can add and remove entries through the site and view them in My Schedule.'],
        ['Apple, Outlook and reminders', 'Import the .ics file into your calendar. It includes a reminder the day before. Check reminders before saving a manual Google export. The Google integration creates reminders one week and two days before the event.'],
        ['Registration and changes', 'When opening and closing dates are available, you can create separate reminders. Confirm registration, start location and changes with the organiser. Exported files do not update automatically.'],
    ],
    es: [
        ['Encontrar una prueba', 'Busca por nombre o localidad. Filtra por modalidad, distrito, este fin de semana o este mes.'],
        ['¿Guardar o planificar?', 'La estrella guarda la prueba en Favoritos. “Añadir al calendario” reserva las fechas. Ninguna acción realiza la inscripción.'],
        ['Google Calendar', 'Puedes guardar una prueba manualmente en Google. Con tu cuenta conectada puedes añadir y eliminar entradas desde el sitio y verlas en Mi Agenda.'],
        ['Apple, Outlook y avisos', 'Importa el archivo .ics: incluye un aviso el día anterior. Confirma los avisos al guardar manualmente en Google. La integración Google crea avisos una semana y dos días antes.'],
        ['Inscripciones y cambios', 'Si hay fechas de apertura y cierre, puedes crear avisos separados. Confirma inscripción, salida y cambios con el organizador. Los archivos exportados no se actualizan automáticamente.'],
    ],
    fr: [
        ['Trouver une épreuve', 'Recherchez un nom ou une localité. Filtrez par discipline, district, ce week-end ou ce mois-ci.'],
        ['Enregistrer ou planifier ?', 'L’étoile enregistre une épreuve dans les Favoris. « Ajouter au calendrier » réserve les dates. Aucune de ces actions ne vous inscrit à l’épreuve.'],
        ['Google Calendar', 'Enregistrez une épreuve manuellement dans Google. Avec un compte connecté, ajoutez et supprimez les événements depuis le site et consultez-les dans Mon Agenda.'],
        ['Apple, Outlook et rappels', 'Importez le fichier .ics : il inclut un rappel la veille. Vérifiez les rappels lors d’un enregistrement manuel dans Google. L’intégration Google crée des rappels une semaine et deux jours avant.'],
        ['Inscriptions et changements', 'Si les dates d’ouverture et de clôture sont disponibles, créez des rappels séparés. Confirmez inscription, départ et changements auprès de l’organisateur. Les fichiers exportés ne se mettent pas à jour automatiquement.'],
    ],
};

export default function PlanningHelp() {
    const { language } = useTranslation();
    return <div className="grid gap-3 mb-8">{(steps[language] || steps.pt).map(([title, body]) =>
        <section key={title} className="border border-line bg-surface rounded p-4">
            <h2 className="text-base font-bold text-ink mt-0 mb-2">{title}</h2>
            <p className="text-sm text-muted m-0 leading-relaxed">{body}</p>
        </section>
    )}</div>;
}
