'use client';
import { useState } from 'react';
import { CalendarPlus, CalendarMinus, LoaderCircle } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { myEventsText } from '../i18n/myEventsCopy';
import { removeCalendarEvent } from '../utils/calendarRemoval';
import styles from './site.module.css';
import { trackEvent } from './AnalyticsTracker';
import {raceMonth} from '../utils/partialDates';

export default function GoogleCalendarAction({ event, inCalendar, collection }) {
    const { language } = useTranslation();
    const [busy, setBusy] = useState(false);
    const [failed, setFailed] = useState(false);
    const tr = key => myEventsText(language, key);
    async function act(click) {
        click.stopPropagation(); click.preventDefault();
        setBusy(true); setFailed(false);
        try {
            if (inCalendar) {
                await removeCalendarEvent(event, {
                    confirm: () => window.confirm(tr('confirmRemoveCalendar').replace('{title}', event.title)),
                    preserve: async () => {
                        const ids = [event.id, ...(event._allIds || [])];
                        const status = collection.statusFor(event);
                        if (status && !collection.favorites.some(id => ids.includes(id))) await collection.setStatus(event, status);
                    },
                    refresh: collection.refreshCalendar,
                });
            } else {
                const { autoAddToGoogleCalendar, generateGoogleCalendarUrl } = await import('../utils/calendarExport');
                const added = await autoAddToGoogleCalendar(event, 'race', generateGoogleCalendarUrl(event, 'race'));
                if (added && !collection.statusFor(event)) {
                    try { await collection.setStatus(event, 'interested'); }
                    catch { setFailed('personal'); }
                }
                trackEvent('ICS_EXPORT');
            }
        } catch { setFailed(true); }
        finally { setBusy(false); }
    }
    const missingDay=!inCalendar&&raceMonth(event);
    const disabled = Boolean(missingDay) || busy || Boolean(collection.isSignedIn && (collection.isLoading || collection.error || (inCalendar && !collection.canEdit)));
    const label = missingDay?({pt:'Dia por confirmar',en:'Day to be confirmed',es:'Día por confirmar',fr:'Jour à confirmer'})[language]:tr(inCalendar ? 'removeCalendar' : 'export');
    return <span className={styles.calendarActionWrap} aria-busy={busy}>
        <button type="button" className={`${styles.eventExportBtn} ${styles.calendarAction}`} data-remove={inCalendar}
            aria-label={`${label}: ${event.title}`} title={label} disabled={disabled} onClick={act}>
            {busy ? <LoaderCircle size={17} className="animate-spin" /> : inCalendar ? <CalendarMinus size={18} /> : <CalendarPlus size={18} />}
        </button>
        {failed && <span role="alert" className={styles.calendarActionError}>{tr(failed === 'personal' ? 'calendarSavedStateError' : 'calendarError')}</span>}
    </span>;
}
