"use client";

import { ArrowUpRight, Bike, Flag, MapPin } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';

const copy = {
    pt: { title: 'Calendário de ciclismo', description: 'Provas, datas e informações para planear a tua época.', place: 'Portugal e internacional' },
    en: { title: 'Cycling calendar', description: 'Races, dates and details to plan your season.', place: 'Portugal and international' },
    es: { title: 'Calendario de ciclismo', description: 'Pruebas, fechas e información para planificar tu temporada.', place: 'Portugal e internacional' },
    fr: { title: 'Calendrier cycliste', description: 'Épreuves, dates et informations pour préparer votre saison.', place: 'Portugal et international' },
};

export default function PageHeading({ title, subtitle, icon: Icon = Flag, hero = false }) {
    const { language } = useTranslation();
    const text = copy[language] || copy.pt;
    if (!hero) return (
        <header className={styles.heading}>
            <div className={styles.eyebrow}><Icon size={15} aria-hidden="true" /> Cycling Calendar</div>
            <h1>{title}</h1>
            {subtitle && <p>{subtitle}</p>}
        </header>
    );
    return (
        <header className={styles.hero}>
            <div>
                <div className={styles.eyebrow}><Bike size={15} aria-hidden="true" />Cycling Calendar / Portugal</div>
                <h1>{text.title}</h1>
                <p>{text.description}</p>
            </div>
            <div className={styles.heroMeta}>
                <span><MapPin size={13} aria-hidden="true" />{text.place}</span>
                <span><ArrowUpRight size={13} aria-hidden="true" />FPC · Cabreira · Stop & Go</span>
            </div>
        </header>
    );
}
