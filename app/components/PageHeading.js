"use client";

import { ArrowUpRight, Bike, Flag, MapPin } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';

const copy = {
    pt: { eyebrow: 'O ciclismo acontece aqui', title: 'A tua próxima partida está aqui.', description: 'Da estrada aos trilhos. Descobre provas, guarda as favoritas e prepara a tua época de ciclismo.', place: 'Portugal e além', calendar: 'O teu calendário de ciclismo' },
    en: { eyebrow: 'Where cycling happens', title: 'Your next start line is here.', description: 'From roads to trails. Discover races, save your favourites and plan your cycling season.', place: 'Portugal and beyond', calendar: 'Your cycling calendar' },
    es: { eyebrow: 'Aquí se vive el ciclismo', title: 'Tu próxima salida está aquí.', description: 'De la carretera a los senderos. Descubre pruebas, guarda tus favoritas y prepara tu temporada.', place: 'Portugal y más allá', calendar: 'Tu calendario de ciclismo' },
    fr: { eyebrow: 'Le cyclisme se vit ici', title: 'Votre prochain départ est ici.', description: 'De la route aux sentiers. Découvrez les épreuves, gardez vos favorites et préparez votre saison.', place: 'Au Portugal et au-delà', calendar: 'Votre calendrier cycliste' },
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
            <div className={styles.eyebrow}><Bike size={16} aria-hidden="true" />{text.eyebrow}</div>
            <h1>{text.title}</h1>
            <p>{text.description}</p>
            <div className={styles.heroMeta}>
                <span><MapPin size={13} aria-hidden="true" />{text.place}</span>
                <span><ArrowUpRight size={13} aria-hidden="true" />FPC · Cabreira · Stop & Go</span>
            </div>
            <svg className={styles.heroArt} viewBox="0 0 370 330" aria-hidden="true">
                {[0, 18, 36, 54, 72, 90].map(offset => <path key={offset} transform={`translate(${offset / 3} ${offset / 2})`} d="M35 -20 C240 -25 330 55 235 115 S40 170 135 210 S320 230 290 350" />)}
                <path className={styles.route} d="M120 -20 C310 10 325 72 232 122 S78 173 164 207 S335 244 292 350" />
                <circle cx="164" cy="207" r="8" fill="#d5f478" stroke="#153e35" strokeWidth="4" />
            </svg>
        </header>
    );
}
