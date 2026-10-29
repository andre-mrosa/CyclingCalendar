'use client';
import { useEffect, useId, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { useSWRConfig } from 'swr';
import { useTranslation } from '../i18n/useTranslation';
import { activatePushDevice } from '../utils/pushOnboarding';

const copy = {
    pt: { title:'Notificações neste dispositivo', detail:'Recebe um resumo diário quando aparecerem novas edições das tuas provas favoritas. Só enviamos se houver novidades.',
        enable:'Ativar notificações', disable:'Desativar neste dispositivo', save:'Guardar horário', hour:'Hora do resumo diário', zone:'Fuso horário',
        login:'Inicia sessão para ativar notificações.', follow:'Ativa primeiro «Adicionar novas edições aos favoritos».', favorites:'Abrir favoritos',
        unsupported:'Este navegador não permite notificações push. No iPhone ou iPad, adiciona a app ao ecrã principal e abre-a a partir do ícone.',
        denied:'As notificações estão bloqueadas. Permite-as nas definições do navegador ou do telemóvel e volta a abrir a app.',
        setup:'As notificações estão a ser configuradas. Tenta mais tarde.', error:'Não foi possível guardar as notificações. Tenta novamente.',
        ready:'Notificações ativas neste dispositivo.', saved:'Horário guardado.', off:'Notificações desativadas neste dispositivo.',
        timing:'10:00 por defeito. O primeiro resumo inclui as novas edições já disponíveis no calendário. O envio é feito à hora escolhida; a receção pode atrasar se o dispositivo estiver sem ligação ou com restrições.', retry:'Tentar novamente' },
    en: { title:'Notifications on this device', detail:'Receive a daily summary when new editions of your favorite events appear. Only when there is news.',
        enable:'Enable notifications', disable:'Disable on this device', save:'Save schedule', hour:'Daily summary time', zone:'Time zone',
        login:'Sign in to enable notifications.', follow:'First enable “Add new editions to favorites”.', favorites:'Open favorites',
        unsupported:'This browser does not support push notifications. On iPhone or iPad, add the app to your Home Screen and open it from its icon.',
        denied:'Notifications are blocked. Allow them in your browser or phone settings and reopen the app.', setup:'Notifications are being configured. Try later.',
        error:'Could not save notifications. Please try again.', ready:'Notifications enabled on this device.', saved:'Schedule saved.', off:'Notifications disabled on this device.',
        timing:'Default: 10:00. The first summary includes newer editions already in the calendar. We send at your chosen hour; delivery may be delayed by connectivity or device restrictions.', retry:'Try again' },
    es: { title:'Notificaciones en este dispositivo', detail:'Recibe un resumen diario cuando aparezcan nuevas ediciones de tus pruebas favoritas. Solo si hay novedades.',
        enable:'Activar notificaciones', disable:'Desactivar en este dispositivo', save:'Guardar horario', hour:'Hora del resumen diario', zone:'Zona horaria',
        login:'Inicia sesión para activar las notificaciones.', follow:'Activa primero «Añadir nuevas ediciones a favoritos».', favorites:'Abrir favoritos',
        unsupported:'Este navegador no admite notificaciones push. En iPhone o iPad, añade la app a la pantalla de inicio y ábrela desde su icono.',
        denied:'Las notificaciones están bloqueadas. Permítelas en los ajustes del navegador o teléfono y vuelve a abrir la app.', setup:'Las notificaciones se están configurando. Inténtalo más tarde.',
        error:'No se pudieron guardar las notificaciones. Inténtalo de nuevo.', ready:'Notificaciones activas en este dispositivo.', saved:'Horario guardado.', off:'Notificaciones desactivadas en este dispositivo.',
        timing:'Por defecto: 10:00. El primer resumen incluye las nuevas ediciones ya disponibles. Enviamos a la hora elegida; la recepción puede retrasarse por la conexión o restricciones del dispositivo.', retry:'Reintentar' },
    fr: { title:'Notifications sur cet appareil', detail:'Recevez un résumé quotidien des nouvelles éditions de vos épreuves favorites. Uniquement en cas de nouveautés.',
        enable:'Activer les notifications', disable:'Désactiver sur cet appareil', save:'Enregistrer l’horaire', hour:'Heure du résumé quotidien', zone:'Fuseau horaire',
        login:'Connectez-vous pour activer les notifications.', follow:'Activez d’abord «Ajouter les nouvelles éditions aux favoris».', favorites:'Ouvrir les favoris',
        unsupported:'Ce navigateur ne permet pas les notifications push. Sur iPhone ou iPad, ajoutez l’app à l’écran d’accueil et ouvrez-la depuis son icône.',
        denied:'Les notifications sont bloquées. Autorisez-les dans les réglages du navigateur ou du téléphone puis rouvrez l’app.', setup:'Les notifications sont en cours de configuration. Réessayez plus tard.',
        error:'Impossible d’enregistrer les notifications. Réessayez.', ready:'Notifications actives sur cet appareil.', saved:'Horaire enregistré.', off:'Notifications désactivées sur cet appareil.',
        timing:'Par défaut : 10:00. Le premier résumé inclut les nouvelles éditions déjà disponibles. Envoi à l’heure choisie ; la réception peut être retardée par la connexion ou les restrictions de l’appareil.', retry:'Réessayer' },
};
const idFor = async subscription => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',
    new TextEncoder().encode(subscription.endpoint))), byte => byte.toString(16).padStart(2,'0')).join('');
const followConsent = {
    pt:'Ao ativar, as novas edições são adicionadas aos teus favoritos e recebes um resumo à hora escolhida (10:00 por defeito). O email mantém a tua escolha atual.',
    en:'Enabling this adds new editions to your favorites and sends a summary at your chosen time (default: 10:00). Your email preference stays as chosen.',
    es:'Al activar, las nuevas ediciones se añaden a tus favoritos y recibes un resumen a la hora elegida (10:00 por defecto). Se mantiene tu preferencia de email.',
    fr:'L’activation ajoute les nouvelles éditions à vos favoris et envoie un résumé à l’heure choisie (10:00 par défaut). Votre choix d’email est conservé.',
};
const testCopy = {
    pt:['Enviar notificação de teste','Teste enviado. Confirma se recebeste a notificação neste dispositivo.'],
    en:['Send test notification','Test sent. Check whether the notification arrived on this device.'],
    es:['Enviar notificación de prueba','Prueba enviada. Comprueba si recibiste la notificación en este dispositivo.'],
    fr:['Envoyer une notification de test','Test envoyé. Vérifiez la réception sur cet appareil.'],
};
export default function FavoritePushSettings({ isSignedIn, userId, onboarding = false, onEnabled, onDenied }) {
    const { language } = useTranslation();
    const { mutate } = useSWRConfig();
    const text = copy[language] || copy.pt;
    const headingId = useId();
    const [device, setDevice] = useState(null);
    const [hour, setHour] = useState(10);
    const [timeZone, setTimeZone] = useState('Europe/Lisbon');
    const [busy, setBusy] = useState(false);
    const [message, setMessage] = useState('');
    const [retry, setRetry] = useState(0);
    useEffect(() => {
        if (!isSignedIn) return;
        let cancelled = false;
        (async () => {
            try {
                if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
                    if (!cancelled) setDevice({ supported:false, userId });
                    return;
                }
                await navigator.serviceWorker.register('/sw.js', { scope:'/', updateViaCache:'none' });
                const registration = await navigator.serviceWorker.ready;
                const subscription = await registration.pushManager.getSubscription();
                const response = await fetch('/api/notifications/push' + (subscription ? '?id=' + await idFor(subscription) : ''), { cache:'no-store' });
                if (!response.ok) throw new Error();
                const result = await response.json();
                if (cancelled) return;
                setHour(result.hour);
                setTimeZone(result.enabled ? result.timeZone : Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Lisbon');
                setDevice({ ...result, supported:true, registration, subscription, userId });
            } catch { if (!cancelled) { setMessage('error'); setDevice({ failed:true, userId }); } }
        })();
        return () => { cancelled = true; };
    }, [isSignedIn, userId, retry]);
    const current = device?.userId === userId ? device : null;
    async function save() {
        setBusy(true); setMessage('');
        try {
            const result = await activatePushDevice({ ...current, hour, timeZone, language, enableFollowing:onboarding });
            setDevice({ ...current, ...result }); setMessage(current.enabled ? 'saved' : 'ready');
            if (onboarding && !current.follow) mutate(['/api/favorites/editions', userId]).catch(() => {});
            onEnabled?.();
        } catch {
            setMessage(Notification.permission === 'denied' ? 'denied' : 'error');
            if (Notification.permission === 'denied') onDenied?.();
        } finally { setBusy(false); }
    }
    async function disable() {
        setBusy(true); setMessage('');
        try {
            const response = await fetch('/api/notifications/push', { method:'DELETE', headers:{ 'Content-Type':'application/json' },
                body:JSON.stringify({ id:await idFor(current.subscription) }) });
            if (!response.ok) throw new Error();
            await current.subscription.unsubscribe();
            setDevice({ ...current, enabled:false, subscription:null }); setMessage('off');
        } catch { setMessage('error'); } finally { setBusy(false); }
    }
    async function sendTest() {
        setBusy(true); setMessage('');
        try {
            const response = await fetch('/api/notifications/push', { method:'POST', headers:{ 'Content-Type':'application/json' },
                body:JSON.stringify({ id:await idFor(current.subscription) }) });
            if (!response.ok) throw new Error();
            setMessage('testSent');
        } catch { setMessage('error'); } finally { setBusy(false); }
    }
    const zones = [...new Set([timeZone, 'Europe/Lisbon', 'Atlantic/Azores', 'Atlantic/Madeira', 'UTC'])];
    const button = 'px-4 py-2.5 rounded-xl border border-line text-sm font-semibold disabled:opacity-50';
    return <section className="bg-surface border border-line rounded-2xl p-6 sm:p-8 shadow-sm" aria-labelledby={headingId}>
        <h2 id={headingId} className="font-semibold text-ink flex items-center gap-2"><Bell size={18} className="text-brand" />{text.title}</h2>
        <p className="text-sm text-muted mt-2">{text.detail}</p>
        {!isSignedIn ? <Link href="/sign-in?redirect_url=%2Fdefinicoes" className="text-brand block mt-4">{text.login}</Link> :
            !current ? <p role="status" className="mt-4">…</p> : current.failed ?
                <button type="button" className={button + ' mt-4'} onClick={() => { setMessage(''); setRetry(retry + 1); }}>{text.retry}</button> :
                !current.supported ? <p className="text-sm mt-4">{text.unsupported}</p> : <>
                    {!current.available && <p className="text-sm mt-4">{text.setup}</p>}
                    {onboarding ? <p className="text-sm mt-4">{followConsent[language] || followConsent.pt}</p> :
                        !current.follow && <p className="text-sm mt-4">{text.follow} <Link href="/favoritos" className="text-brand underline">{text.favorites}</Link></p>}
                    <div className="flex flex-wrap gap-4 my-4">
                        <label className="text-sm font-medium">{text.hour}<select className="block mt-2 rounded-lg border border-line bg-soft p-2 text-ink" value={hour} onChange={event => setHour(Number(event.target.value))}>
                            {Array.from({ length:24 }, (_, value) => <option key={value} value={value}>{String(value).padStart(2,'0')}:00</option>)}
                        </select></label>
                        <label className="text-sm font-medium">{text.zone}<select className="block mt-2 rounded-lg border border-line bg-soft p-2 text-ink" value={timeZone} onChange={event => setTimeZone(event.target.value)}>
                            {zones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
                        </select></label>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <button type="button" onClick={save} disabled={busy || !current.available || (!current.follow && !onboarding)} className={button + ' bg-brand text-white'}>{current.enabled ? text.save : text.enable}</button>
                        {current.enabled && current.subscription && <button type="button" onClick={disable} disabled={busy} className={button}>{text.disable}</button>}
                        {current.enabled && current.subscription && <button type="button" onClick={sendTest} disabled={busy} className={button}>{(testCopy[language] || testCopy.pt)[0]}</button>}
                    </div>
                    {current.enabled && <p className="text-sm text-brand mt-3">{text.ready}</p>}
                    <p className="text-xs text-muted mt-4">{text.timing}</p>
                </>}
        {message && <p role="status" className="text-sm mt-3">{message === 'testSent' ? (testCopy[language] || testCopy.pt)[1] : text[message]}</p>}
    </section>;
}
