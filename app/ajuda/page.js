"use client";

import { useSettingsStore } from '../store/useSettingsStore';
import { useTranslation } from '../i18n/useTranslation';
import { HelpCircle } from 'lucide-react';
import RegionAssistant from '../components/RegionAssistant';
import EscalaoAssistant from '../components/EscalaoAssistant';
import PageHeading from '../components/PageHeading';
import styles from '../components/site.module.css';

export default function Ajuda() {
    const { t } = useTranslation();
    const { setDefaultRegiao, setDefaultEscalao } = useSettingsStore();

    const handleApply = (type, val) => {
        if (type === 'regiao') {
            setDefaultRegiao(val);
        } else {
            setDefaultEscalao(val);
        }
    };

    return (
        <div className={`${styles.page} ${styles.secondaryWide}`}>
            <PageHeading title={t('help_title')} subtitle={t('help_subtitle')} icon={HelpCircle} />

            <div className={styles.supportGrid}>
                <RegionAssistant onApply={(val) => handleApply('regiao', val)} />
                <EscalaoAssistant onApply={(val) => handleApply('escalao', val)} />
            </div>
        </div>
    );
}
