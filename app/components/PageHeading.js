"use client";

import { Flag, Route } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';
import { interfaceText } from '../i18n/interfaceCopy';

const copy = {
    pt: {
        title: 'Calendário de provas de ciclismo em Portugal',
        description: 'Consulta datas e ligações de provas de estrada, BTT, gravel e granfondos. Confirma os detalhes na fonte.',
        eyebrow: 'Cycling Calendar Portugal'
    },
    en: {
        title: 'Cycling calendar in Portugal',
        description: 'Browse dates and links for road races, MTB, gravel and granfondos. Confirm details at the source.',
        eyebrow: 'Cycling Calendar Portugal'
    },
    es: {
        title: 'Calendario de pruebas de ciclismo en Portugal',
        description: 'Consulta fechas y enlaces de carretera, BTT, gravel y granfondos. Confirma los detalles en la fuente.',
        eyebrow: 'Cycling Calendar Portugal'
    },
    fr: {
        title: 'Calendrier des courses cyclistes au Portugal',
        description: 'Consultez les dates et liens des courses sur route, VTT, gravel et granfondos. Confirmez les détails à la source.',
        eyebrow: 'Cycling Calendar Portugal'
    },
};

export default function PageHeading({ title, subtitle, icon: Icon = Flag, hero = false, children }) {
    const { language } = useTranslation();
    const text = copy[language] || copy.pt;
    return (
        <header className={`${styles.heading} ${hero ? styles.homeHeading : ''}`}>
            <div>
                <div className={styles.eyebrow}>{!hero && <Icon size={14} aria-hidden="true" />} {hero ? interfaceText(language, 'country') : 'Cycling Calendar'}</div>
                <h1>{hero ? interfaceText(language, 'homeTitle') : title}</h1>
                <p>{hero ? interfaceText(language, 'homeIntro') : subtitle || text.description}</p>
            </div>
            {children || (hero && <div className={styles.homeAside}><Route size={26} aria-hidden="true" /><div><strong>{interfaceText(language, 'homeAside')}</strong><p>{interfaceText(language, 'homeAsideIntro')}</p></div></div>)}
        </header>
    );
}
