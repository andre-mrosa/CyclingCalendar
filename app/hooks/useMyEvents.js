'use client';
import { useFavorites } from './useFavorites';
import { useCalendarEvents } from './useCalendarEvents';
import { useParticipationStates } from './useParticipationStates';
import { personalStatus, changePersonalStatus } from '../utils/personalCollection';
import { useCallback } from 'react';

export function useMyEvents(events) {
    const saved = useFavorites(events);
    const calendar = useCalendarEvents();
    const participation = useParticipationStates();
    const statusFor = useCallback(event => personalStatus(event, saved.favorites, calendar.markedSet, participation.states), [saved.favorites, calendar.markedSet, participation.states]);
    async function setStatus(event, status) {
        await changePersonalStatus(event, status, { favorites: saved.favorites, toggleFavorite: saved.toggleFavorite, persist: participation.user ? async body => {
            const response = await fetch('/api/planning/states', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (!response.ok) throw new Error('Could not save event');
        } : null });
        if (participation.user) await participation.mutate();
    }
    return { ...saved, ...calendar, statusFor, setStatus,
        canEdit: saved.isLoaded && (!participation.user || Boolean(participation.data && !participation.error)),
        personalLoading: !saved.isLoaded || Boolean(participation.user && ((!participation.data && !participation.error) || calendar.isLoading)),
        personalError: participation.error || calendar.error,
        refreshPersonal: () => { participation.mutate(); calendar.refreshCalendar(); },
    };
}
