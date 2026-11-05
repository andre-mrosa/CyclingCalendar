"use client";
import { findCalendarConflict } from "../utils/calendarEntries";
import useSWR from 'swr';
import { useUser } from '@clerk/nextjs';
import { useMemo, useCallback, useEffect } from 'react';
import { useOnline, useStoredString, writeStored } from './useBrowserState';
import {calendarMarked} from '../utils/registrationReminders';

const fetcher = async ([url]) => {
    const response = await fetch(url);
    const data = await response.json();
    if (!response.ok || !data.success) throw new Error('Calendar unavailable');
    return data;
};

export function useCalendarEvents() {
    const { isSignedIn, user } = useUser();
    const userId = isSignedIn && user ? user.id : null;
    const cacheKey = userId ? `cycling_agenda_${userId}` : null;

    const { data: remoteData, error, mutate, isLoading } = useSWR(
        userId ? ['/api/calendar/events', userId] : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 15000,
            shouldRetryOnError: false
        }
    );

    const online = useOnline();
    useEffect(() => {
        const refresh = () => { void mutate(); };
        window.addEventListener('cycling-calendar-updated', refresh);
        return () => window.removeEventListener('cycling-calendar-updated', refresh);
    }, [mutate]);
    const cached = useStoredString(cacheKey || 'cycling_agenda_guest', '{}');
    useEffect(() => {
        if (cacheKey && remoteData?.success) writeStored(cacheKey, JSON.stringify(remoteData));
    }, [cacheKey, remoteData]);
    const data = useMemo(() => {
        if (!userId) return { markedEventIds: [], markedDates: {} };
        if (remoteData?.success) return remoteData;
        if (!online || error) {
            try { return JSON.parse(cached); } catch {}
        }
        return remoteData || { markedEventIds: [], markedDates: {} };
    }, [remoteData, userId, online, cached, error]);

    const markedSet = useMemo(() => {
        return new Set(data?.markedEventIds || []);
    }, [data?.markedEventIds]);

    const markedDates = useMemo(() => {
        return data?.markedDates || {};
    }, [data?.markedDates]);

    const isMarked = useCallback((eventId, target = 'event', allIds = []) => {
        if (!isSignedIn || !eventId) return false;

        return calendarMarked(markedSet,String(eventId),target,allIds||[]);
    }, [isSignedIn, markedSet]);

    const markedEntries = data?.markedEntries || {};
    const getCalendarEntry = (eventId, allIds = []) => remoteData?.success ? (markedEntries[eventId] || allIds.map(id => markedEntries[id]).find(Boolean) || null) : null;
    const getDateConflict = useCallback(event => isSignedIn ? findCalendarConflict(event, data?.markedEntries) : { hasConflict: false }, [isSignedIn, data?.markedEntries]);

    return {
        isSignedIn,
        markedSet,
        markedDates,
        isMarked,
        getDateConflict,
        getCalendarEntry,
        refreshCalendar: mutate,
        isLoading,
        error
    };
}
