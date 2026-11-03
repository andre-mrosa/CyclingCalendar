const copy = {
    title: ['As minhas provas', 'My events', 'Mis pruebas', 'Mes épreuves'],
    intro: ['Guarda provas, organiza a tua participação e consulta tudo em lista ou calendário.', 'Save events, plan your participation and view everything as a list or calendar.', 'Guarda pruebas, organiza tu participación y consulta todo en lista o calendario.', 'Enregistrez vos épreuves, préparez votre participation et consultez la liste ou le calendrier.'],
    all: ['Todas', 'All', 'Todas', 'Toutes'],
    interested: ['Interessado', 'Interested', 'Me interesa', 'Intéressé'],
    going: ['Vou participar', 'Planning to attend', 'Voy a participar', 'Participation prévue'],
    registered: ['Já inscrito', 'Registered', 'Ya inscrito', 'Déjà inscrit'],
    save: ['Guardar prova', 'Save event', 'Guardar prueba', 'Enregistrer'],
    remove: ['Remover das minhas provas', 'Remove from my events', 'Quitar de mis pruebas', 'Retirer de mes épreuves'],
    status: ['Participação', 'Participation', 'Participación', 'Participation'],
    options: ['Google Calendar e avisos', 'Google Calendar and alerts', 'Google Calendar y avisos', 'Google Calendar et alertes'],
    google: ['No Google Calendar', 'In Google Calendar', 'En Google Calendar', 'Dans Google Calendar'],
    export: ['Adicionar ao Google Calendar', 'Add to Google Calendar', 'Añadir a Google Calendar', 'Ajouter à Google Calendar'],
    empty: ['Ainda não tens provas guardadas. Escolhe uma prova e seleciona «Guardar prova».', 'No saved events yet. Choose an event and select “Save event”.', 'Todavía no tienes pruebas guardadas. Elige una y selecciona «Guardar prueba».', 'Aucune épreuve enregistrée. Choisissez une épreuve puis « Enregistrer ».'],
    loadError: ['Não foi possível carregar todo o teu planeamento. Tenta novamente.', 'Could not load all your planning. Please try again.', 'No se pudo cargar toda tu planificación. Inténtalo de nuevo.', 'Votre planification n’a pas pu être entièrement chargée. Réessayez.'],
};
export const myEventsText = (language, key) => copy[key]?.[({ pt: 0, en: 1, es: 2, fr: 3 })[language] ?? 0] || key;
