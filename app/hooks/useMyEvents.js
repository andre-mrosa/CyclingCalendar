'use client';
import { useFavorites } from './useFavorites';
import { useCalendarEvents } from './useCalendarEvents';
import { useParticipationStates } from './useParticipationStates';
import { personalStatus, changePersonalStatus, removePersonalEvent } from '../utils/personalCollection';
import { removeCalendarEvent } from '../utils/calendarRemoval';
import { useTranslation } from '../i18n/useTranslation';
import { myEventsText } from '../i18n/myEventsCopy';
import { useCallback, useEffect } from 'react';
import { useOnline } from './useBrowserState';
import { saveOfflinePersonal } from '../utils/offlineSnapshot';

export function useMyEvents(events) {
    const { language } = useTranslation();
    const saved = useFavorites(events);
    const calendar = useCalendarEvents();
    const participation = useParticipationStates();
    const online = useOnline();
    const statusFor = useCallback(event => personalStatus(event, saved.favorites, calendar.markedSet, participation.states), [saved.favorites, calendar.markedSet, participation.states]);
    const offlineScope = participation.user?.id || (saved.isSignedIn ? '' : 'guest');
    useEffect(() => {
        if (!online || !saved.isLoaded || !offlineScope) return;
        // Clear the previous account immediately, even while this account loads.
        try {
            saveOfflinePersonal(localStorage, offlineScope, [], () => null, () => false);
            if (saved.isSignedIn && (!participation.data || participation.error || calendar.isLoading || calendar.error)) return;
            saveOfflinePersonal(localStorage, offlineScope, events, statusFor, calendar.isMarked);
        } catch { /* The live app still works when browser storage is blocked. */ }
    }, [online, saved.isLoaded, saved.isSignedIn, offlineScope, participation.data, participation.error, calendar.isLoading, calendar.error, calendar.isMarked, events, statusFor]);
    async function setStatus(event, status) {
        const persist = () => changePersonalStatus(event, status, { favorites: saved.favorites, toggleFavorite: saved.toggleFavorite, persist: participation.user ? async body => {
            const response = await fetch('/api/planning/states', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error('Could not save event');
        } : null });
        if (!status) {
            if (saved.isSignedIn && (calendar.isLoading || calendar.error)) throw new Error('Calendar state unavailable');
            const inCalendar = calendar.isMarked(event.id, 'event', event._allIds || []);
            const confirmed = await removePersonalEvent({
                confirm: () => window.confirm(myEventsText(language, inCalendar ? 'confirmRemoveBoth' : 'confirmRemovePersonal').replace('{title}', event.title)),
                inCalendar,
                removeCalendar: () => removeCalendarEvent(event, { confirm: () => true, refresh: calendar.refreshCalendar }),
                removePersonal: persist,
            });
            if (!confirmed) return false;
        } else await persist();
        if (participation.user) await participation.mutate();
        return true;
    }
    return { ...saved, ...calendar, statusFor, setStatus,
        canEdit: saved.isLoaded && (!participation.user || Boolean(participation.data && !participation.error)),
        personalLoading: !saved.isLoaded || Boolean(participation.user && ((!participation.data && !participation.error) || calendar.isLoading)),
        personalError: participation.error || calendar.error,
        refreshPersonal: () => { participation.mutate(); calendar.refreshCalendar(); },
    };
}
