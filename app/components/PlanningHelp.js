import { useTranslation } from '../i18n/useTranslation';
const copy = {
  "pt": [
    [
      "Encontrar uma prova",
      "Pesquisa pelo nome e filtra por data, modalidade ou localização publicada. Alterna entre lista e calendário."
    ],
    [
      "Consultar a fonte",
      "O nome abre a ficha da prova. «Ver original» abre a fonte. Confirma ali inscrições, horários, percursos e alterações."
    ],
    [
      "As minhas provas",
      "Guardar prova coloca-a em Interessado. Com sessão iniciada, podes escolher Vou participar ou Já inscrito. Consulta a mesma coleção em lista ou calendário e filtra por participação. Estes estados são indicações pessoais; não efetuam uma inscrição."
    ],
    [
      "Google Calendar e avisos",
      "Adicionar ao Google Calendar é uma ação separada. As marcações antigas continuam visíveis em As minhas provas. Remover uma prova desta coleção não apaga eventos no Google. As opções de novas edições, avisos e subscrição estão reunidas em Google Calendar e avisos."
    ]
  ],
  "en": [
    [
      "Find an event",
      "Search by name and filter by date, discipline or published location. Switch between list and calendar."
    ],
    [
      "Read the source",
      "The name opens the event page. View original opens its source. Confirm registration, schedules, routes and changes there."
    ],
    [
      "My events",
      "Save event marks it as Interested. When signed in, choose Planning to attend or Registered. Browse the same collection as a list or calendar and filter by participation. These are personal statuses, not registration actions."
    ],
    [
      "Google Calendar and alerts",
      "Add to Google Calendar is a separate action. Existing calendar entries remain visible in My events. Removing an event from this collection does not delete it in Google. Edition following, alerts and subscriptions are grouped under Google Calendar and alerts."
    ]
  ],
  "es": [
    [
      "Encontrar una prueba",
      "Busca por nombre y filtra por fecha, modalidad o ubicación publicada. Alterna entre lista y calendario."
    ],
    [
      "Consultar la fuente",
      "El nombre abre la ficha. Ver original abre la fuente. Confirma allí inscripciones, horarios, recorridos y cambios."
    ],
    [
      "Mis pruebas",
      "Guardar prueba la marca como Me interesa. Con sesión iniciada, elige Voy a participar o Ya inscrito. Consulta la misma colección en lista o calendario y filtra por participación. Estos estados personales no realizan una inscripción."
    ],
    [
      "Google Calendar y avisos",
      "Añadir a Google Calendar es una acción separada. Las entradas antiguas siguen en Mis pruebas. Quitar una prueba de esta colección no la borra de Google. Las opciones de nuevas ediciones, avisos y suscripción están agrupadas en Google Calendar y avisos."
    ]
  ],
  "fr": [
    [
      "Trouver une épreuve",
      "Recherchez un nom et filtrez par date, discipline ou lieu publié. Alternez liste et calendrier."
    ],
    [
      "Consulter la source",
      "Le nom ouvre la fiche. Voir l’original ouvre la source. Confirmez-y inscriptions, horaires, parcours et modifications."
    ],
    [
      "Mes épreuves",
      "Enregistrer marque l’épreuve comme Intéressé. Une fois connecté, choisissez Participation prévue ou Déjà inscrit. Consultez la même collection en liste ou calendrier et filtrez par participation. Ces statuts personnels ne constituent pas une inscription."
    ],
    [
      "Google Calendar et alertes",
      "Ajouter à Google Calendar est une action distincte. Les anciennes entrées restent visibles dans Mes épreuves. Retirer une épreuve de cette collection ne la supprime pas de Google. Le suivi des éditions, les alertes et les abonnements sont regroupés dans Google Calendar et alertes."
    ]
  ]
};
export default function PlanningHelp() {
 const { language } = useTranslation();
 return <div className="grid gap-3 mb-8">{(copy[language] || copy.pt).map(([title, body]) => <section key={title} className="border border-line bg-surface rounded p-4"><h2 className="text-base font-bold text-ink mb-2">{title}</h2><p className="text-sm text-muted leading-relaxed">{body}</p></section>)}</div>;
}
