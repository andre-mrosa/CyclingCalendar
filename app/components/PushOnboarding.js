'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { usePathname } from 'next/navigation';
import { useTranslation } from '../i18n/useTranslation';
import { PUSH_ONBOARDING_KEY, shouldOfferPush } from '../utils/pushOnboarding';
import FavoritePushSettings from './FavoritePushSettings';

const labels = {
    pt:['Ativar notificações na app','Agora não'], en:['Enable app notifications','Not now'],
    es:['Activar notificaciones en la app','Ahora no'], fr:['Activer les notifications de l’app','Pas maintenant'],
};
let sessionChoice = null;
export default function PushOnboarding() {
    const { isLoaded, isSignedIn, user } = useUser();
    const { language } = useTranslation();
    const pathname = usePathname();
    const dialog = useRef(null);
    const [offered, setOffered] = useState(false);
    const [handled, setHandled] = useState(false);
    const text = labels[language] || labels.pt;
    const authPage = pathname.startsWith('/sign-in') || pathname.startsWith('/sign-up') || pathname.startsWith('/admin');
    useEffect(() => {
        const update = () => {
            let choice = sessionChoice;
            try { choice = localStorage.getItem(PUSH_ONBOARDING_KEY) || sessionChoice; } catch { /* Keep the choice in memory if storage is restricted. */ }
            setOffered(shouldOfferPush({
                installed: window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true,
                supported: 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window,
                permission: 'Notification' in window ? Notification.permission : 'denied', choice,
            }));
        };
        const media = window.matchMedia('(display-mode: standalone)');
        const installed = () => update();
        // Also handle an install performed while this page is already open.
        const task = setTimeout(update, 0);
        media.addEventListener('change', installed);
        window.addEventListener('appinstalled', installed);
        return () => { clearTimeout(task); media.removeEventListener('change', installed); window.removeEventListener('appinstalled', installed); };
    }, []);
    const finish = useCallback(choice => {
        sessionChoice = choice;
        try { localStorage.setItem(PUSH_ONBOARDING_KEY, choice); } catch { /* The current app session still remembers the choice. */ }
        setHandled(true);
    }, []);
    const enabled = useCallback(() => finish('enabled'), [finish]);
    const denied = useCallback(() => finish('denied'), [finish]);
    const open = isLoaded && offered && !handled && !authPage;
    useEffect(() => {
        const element = dialog.current;
        if (open && element && !element.open) element.showModal();
        return () => { if (element?.open) element.close(); };
    }, [open]);
    if (!open) return null;
    return <dialog ref={dialog} aria-label={text[0]} onCancel={event => { event.preventDefault(); finish('dismissed'); }}
        className="m-auto w-[90vw] max-w-lg max-h-[90dvh] overflow-y-auto rounded-2xl border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/60">
        <FavoritePushSettings isSignedIn={isSignedIn} userId={user?.id} onboarding onEnabled={enabled} onDenied={denied} />
        <div className="flex justify-end p-4"><button type="button" onClick={() => finish('dismissed')} className="rounded-xl border border-line px-4 py-2 text-sm font-semibold">{text[1]}</button></div>
    </dialog>;
}
