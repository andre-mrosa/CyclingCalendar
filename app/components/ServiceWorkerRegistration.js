'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';
import { startAppUpdates } from '../utils/appUpdates';

const labels = {
    pt:['Nova versão disponível. Guarda o que estás a editar antes de atualizar.','Atualizar'],
    en:['A new version is available. Save your changes before updating.','Update'],
    es:['Hay una nueva versión. Guarda tus cambios antes de actualizar.','Actualizar'],
    fr:['Une nouvelle version est disponible. Enregistrez vos modifications avant de mettre à jour.','Mettre à jour'],
};

export default function ServiceWorkerRegistration() {
    const { language } = useTranslation();
    const [available, setAvailable] = useState(false);
    const updater = useRef(null);
    useEffect(() => { document.documentElement.lang = language; }, [language]);
    useEffect(() => {
        try {
            for (const key of Object.keys(localStorage)) {
                if (/^cycling_calendar_list_|^cycling_calendar_minimal_v[1-4]_|^cycling_favorite_changes_v1_|^cycling_events|^cycling_road/.test(key)) localStorage.removeItem(key);
            }
        } catch { /* Storage can be unavailable in private browsing. */ }
        if (process.env.NODE_ENV !== 'production') return;
        updater.current = startAppUpdates({ version:process.env.NEXT_PUBLIC_APP_VERSION, window, document, navigator,
            onUpdate:setAvailable, onCalendarChange:version => window.dispatchEvent(new CustomEvent('calendar-data-updated', { detail:version })) });
        return () => updater.current?.stop();
    }, []);
    const text = labels[language] || labels.pt;
    return available ? <aside role="status" className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-lg rounded-xl border border-line bg-surface p-4 text-ink shadow-xl">
        <p className="text-sm">{text[0]}</p><button type="button" onClick={() => updater.current?.applyUpdate()} className="mt-3 rounded-lg bg-brand px-4 py-2 text-sm font-semibold text-white">{text[1]}</button>
    </aside> : null;
}
