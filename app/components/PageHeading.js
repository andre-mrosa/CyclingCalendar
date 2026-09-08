"use client";

import { CalendarDays, Database, Flag } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';

const copy = {
    pt: { title: 'Calendário de ciclismo', description: 'Provas de várias fontes reunidas para pesquisa e planeamento.', season: 'Época', sources: 'FPC · Cabreira · Stop & Go' },
    en: { title: 'Cycling calendar', description: 'Events from several sources, gathered for search and planning.', season: 'Season', sources: 'FPC · Cabreira · Stop & Go' },
    es: { title: 'Calendario de ciclismo', description: 'Pruebas de varias fuentes reunidas para búsqueda y planificación.', season: 'Temporada', sources: 'FPC · Cabreira · Stop & Go' },
    fr: { title: 'Calendrier cycliste', description: 'Épreuves de plusieurs sources réunies pour la recherche et la planification.', season: 'Saison', sources: 'FPC · Cabreira · Stop & Go' },
};

export default function PageHeading({ title, subtitle, icon: Icon = Flag, hero = false }) {
    const { language } = useTranslation();
    const text = copy[language] || copy.pt;
    const year = new Date().getFullYear();
    return (
        <header className={`${styles.heading} ${hero ? styles.homeHeading : ''}`}>
            <div>
                <div className={styles.eyebrow}><Icon size={14} aria-hidden="true" /> Cycling Calendar</div>
                <h1>{hero ? text.title : title}</h1>
                <p>{hero ? text.description : subtitle}</p>
            </div>
            <div className={styles.headingMeta}>
                <span><CalendarDays size={14} aria-hidden="true" />{text.season} {year}/{year + 1}</span>
                <span><Database size={14} aria-hidden="true" />{text.sources}</span>
            </div>
        </header>
    );
}
