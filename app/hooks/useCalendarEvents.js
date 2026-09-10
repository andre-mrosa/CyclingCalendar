"use client";
import { findCalendarConflict } from "../utils/calendarEntries";
import useSWR from 'swr';
import { useUser } from '@clerk/nextjs';
import { useMemo, useCallback } from 'react';

const fetcher = (url) => fetch(url).then(res => res.json());

export function useCalendarEvents() {
    const { isSignedIn, user } = useUser();
    const userId = isSignedIn && user ? user.id : null;
    const cacheKey = userId ? `cycling_agenda_${userId}` : null;

    const { data: remoteData, mutate, isLoading } = useSWR(
        isSignedIn ? '/api/calendar/events' : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 15000,
            shouldRetryOnError: false
        }
    );

    const data = useMemo(() => {
        if (!isSignedIn || !userId) {
            return { markedEventIds: [], markedDates: {} };
        }
        if (remoteData && remoteData.success) {
            try {
                localStorage.setItem(cacheKey, JSON.stringify(remoteData));
            } catch (e) {}
            return remoteData;
        }
        if (typeof window !== 'undefined' && cacheKey) {
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) return JSON.parse(cached);
            } catch (e) {}
        }
        return remoteData || { markedEventIds: [], markedDates: {} };
    }, [remoteData, isSignedIn, userId, cacheKey]);

    const markedSet = useMemo(() => {
        return new Set(data?.markedEventIds || []);
    }, [data?.markedEventIds]);

    const markedDates = useMemo(() => {
        return data?.markedDates || {};
    }, [data?.markedDates]);

    const isMarked = useCallback((eventId, target = 'event', allIds = []) => {
        if (!isSignedIn || !eventId) return false;

        if (target === 'registration_open') {
            return markedSet.has(`${eventId}_reg_open`) || (allIds && allIds.some(id => markedSet.has(`${id}_reg_open`)));
        }
        if (target === 'registration_close') {
            return markedSet.has(`${eventId}_reg_close`) || (allIds && allIds.some(id => markedSet.has(`${id}_reg_close`)));
        }

        return markedSet.has(String(eventId)) || (allIds && allIds.some(id => markedSet.has(String(id))));
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
        isLoading
    };
}
