'use client';
import { useFavorites } from './useFavorites';
import { useCalendarEvents } from './useCalendarEvents';
import { useParticipationStates } from './useParticipationStates';
import { personalStatus, changePersonalStatus, removePersonalEvent } from '../utils/personalCollection';
import { removeCalendarEvent } from '../utils/calendarRemoval';
import { useTranslation } from '../i18n/useTranslation';
import { myEventsText } from '../i18n/myEventsCopy';
import { useCallback } from 'react';

export function useMyEvents(events) {
    const { language } = useTranslation();
    const saved = useFavorites(events);
    const calendar = useCalendarEvents();
    const participation = useParticipationStates();
    const statusFor = useCallback(event => personalStatus(event, saved.favorites, calendar.markedSet, participation.states), [saved.favorites, calendar.markedSet, participation.states]);
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
