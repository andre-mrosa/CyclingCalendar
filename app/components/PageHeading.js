"use client";

import { Flag } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';

const copy = {
    pt: { title: 'Calendário de ciclismo', description: 'Provas de várias fontes reunidas para pesquisa e planeamento.' },
    en: { title: 'Cycling calendar', description: 'Events from several sources, gathered for search and planning.' },
    es: { title: 'Calendario de ciclismo', description: 'Pruebas de varias fuentes reunidas para búsqueda y planificación.' },
    fr: { title: 'Calendrier cycliste', description: 'Épreuves de plusieurs sources réunies pour la recherche et la planification.' },
};

export default function PageHeading({ title, subtitle, icon: Icon = Flag, hero = false }) {
    const { language } = useTranslation();
    const text = copy[language] || copy.pt;
    return (
        <header className={`${styles.heading} ${hero ? styles.homeHeading : ''}`}>
            <div>
                <div className={styles.eyebrow}><Icon size={14} aria-hidden="true" /> Cycling Calendar</div>
                <h1>{hero ? text.title : title}</h1>
                <p>{hero ? text.description : subtitle}</p>
            </div>
        </header>
    );
}
