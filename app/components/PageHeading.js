"use client";

import { useTranslation } from '../i18n/useTranslation';
import styles from './site.module.css';

const copy = {
    pt: { title: 'Todas as provas', description: 'Pesquisa, filtra e planeia a tua próxima prova de ciclismo.' },
    en: { title: 'All events', description: 'Search, filter and plan your next cycling event.' },
    es: { title: 'Todas las pruebas', description: 'Busca, filtra y planifica tu próxima prueba ciclista.' },
    fr: { title: 'Toutes les épreuves', description: 'Recherchez, filtrez et planifiez votre prochaine épreuve cycliste.' },
};

export default function PageHeading({ title, subtitle, hero = false }) {
    const { language } = useTranslation();
    const text = copy[language] || copy.pt;
    return (
        <header className={`${styles.heading} ${hero ? styles.homeHeading : ''}`}>
            <div>
                <h1>{hero ? text.title : title}</h1>
                <p>{hero ? text.description : subtitle}</p>
            </div>
        </header>
    );
}
