"use client";

import { Flag } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';

const copy = {
    pt: {
        title: 'Calendário de Provas de Ciclismo em Portugal 2026',
        description: 'Consulta todas as provas de estrada, BTT, gravel e granfondos. Datas oficiais, locais e inscrições num só lugar.',
        eyebrow: 'Cycling Calendar Portugal'
    },
    en: {
        title: 'Cycling Calendar Portugal 2026',
        description: 'Find all road races, MTB, gravel and granfondos in Portugal. Official dates, locations and registrations.',
        eyebrow: 'Cycling Calendar Portugal'
    },
    es: {
        title: 'Calendario de Pruebas de Ciclismo en Portugal 2026',
        description: 'Encuentra todas las pruebas de carretera, BTT, gravel y granfondos en Portugal. Fechas, lugares e inscripciones.',
        eyebrow: 'Cycling Calendar Portugal'
    },
    fr: {
        title: 'Calendrier des Courses Cyclistes au Portugal 2026',
        description: 'Trouvez toutes les courses de route, VTT, gravel et granfondos au Portugal. Dates officielles, lieux et inscriptions.',
        eyebrow: 'Cycling Calendar Portugal'
    },
};

export default function PageHeading({ title, subtitle, icon: Icon = Flag, hero = false }) {
    const { language } = useTranslation();
    const text = copy[language] || copy.pt;
    return (
        <header className={`${styles.heading} ${hero ? styles.homeHeading : ''}`}>
            <div>
                <div className={styles.eyebrow}>{!hero && <Icon size={14} aria-hidden="true" />} {hero ? text.eyebrow : 'Cycling Calendar'}</div>
                <h1>{hero ? text.title : title}</h1>
                <p>{subtitle || text.description}</p>
            </div>
        </header>
    );
}
