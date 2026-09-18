"use client";

import { Flag } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';

const copy = {
    pt: { title: 'Encontra a tua próxima prova.', description: 'Todas as datas. Toda a informação. Num só lugar.', eyebrow: 'Ciclismo em Portugal' },
    en: { title: 'Find your next race.', description: 'Every date. All the information. In one place.', eyebrow: 'Cycling in Portugal' },
    es: { title: 'Encuentra tu próxima prueba.', description: 'Todas las fechas. Toda la información. En un solo lugar.', eyebrow: 'Ciclismo en Portugal' },
    fr: { title: 'Trouve ta prochaine course.', description: 'Toutes les dates. Toutes les informations. Au même endroit.', eyebrow: 'Cyclisme au Portugal' },
};

export default function PageHeading({ title, subtitle, icon: Icon = Flag, hero = false }) {
    const { language } = useTranslation();
    const text = copy[language] || copy.pt;
    return (
        <header className={`${styles.heading} ${hero ? styles.homeHeading : ''}`}>
            <div>
                <div className={styles.eyebrow}>{!hero && <Icon size={14} aria-hidden="true" />} {hero ? text.eyebrow : 'Cycling Calendar'}</div>
                <h1>{hero ? text.title : title}</h1>
                <p>{hero ? text.description : subtitle}</p>
            </div>
        </header>
    );
}
