"use client";

import { ArrowUpRight, Bike, Flag, MapPin } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';

const copy = {
    pt: { title: 'A tua próxima linha de partida.', description: 'Todas as provas de ciclismo, organizadas num só calendário para decidires onde correr a seguir.', place: 'Portugal e além', update: 'Atualizado todos os dias' },
    en: { title: 'Your next start line.', description: 'Every cycling event in one calendar, so you can decide where to race next.', place: 'Portugal and beyond', update: 'Updated every day' },
    es: { title: 'Tu próxima línea de salida.', description: 'Todas las pruebas de ciclismo en un calendario para decidir dónde competir.', place: 'Portugal y más allá', update: 'Actualizado a diario' },
    fr: { title: 'Votre prochaine ligne de départ.', description: 'Toutes les épreuves cyclistes réunies pour choisir votre prochaine course.', place: 'Portugal et au-delà', update: 'Mis à jour chaque jour' },
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
                <span><ArrowUpRight size={13} aria-hidden="true" />{text.update}</span>
                <span><Flag size={13} aria-hidden="true" />FPC · Cabreira · Stop & Go</span>
            </div>
        </header>
    );
}
