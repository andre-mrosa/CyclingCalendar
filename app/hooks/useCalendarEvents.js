"use client";
import useSWR from 'swr';
import { useUser } from '@clerk/nextjs';
import { useMemo, useCallback } from 'react';

const fetcher = (url) => fetch(url).then(res => res.json());

function parsePtDate(dateStr) {
    if (!dateStr || typeof dateStr !== 'string') return null;
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) return dateStr.slice(0, 10);

    const months = {
        'JAN': '01', 'JANEIRO': '01',
        'FEV': '02', 'FEVEREIRO': '02',
        'MAR': '03', 'MARÇO': '03', 'MARCO': '03',
        'ABR': '04', 'ABRIL': '04',
        'MAI': '05', 'MAIO': '05',
        'JUN': '06', 'JUNHO': '06',
        'JUL': '07', 'JULHO': '07',
        'AGO': '08', 'AGOSTO': '08',
        'SET': '09', 'SETEMBRO': '09',
        'OUT': '10', 'OUTUBRO': '10',
        'NOV': '11', 'NOVEMBRO': '11',
        'DEZ': '12', 'DEZEMBRO': '12'
    };

    const clean = dateStr.replace(/,/g, ' ').replace(/\s+/g, ' ').trim().toUpperCase();
    const parts = clean.split(' ');
    const mIdx = parts.findIndex(p => months[p]);
    if (mIdx !== -1) {
        const month = months[parts[mIdx]];
        let day = '01';
        for (let i = mIdx - 1; i >= 0; i--) {
            const num = parseInt(parts[i], 10);
            if (!isNaN(num) && num >= 1 && num <= 31) {
                day = num.toString().padStart(2, '0');
                break;
            }
        }
        let year = new Date().getFullYear().toString();
        for (let i = mIdx + 1; i < parts.length; i++) {
            if (/^\d{4}$/.test(parts[i])) {
                year = parts[i];
                break;
            }
        }
        return `${year}-${month}-${day}`;
    }
    return null;
}

export function useCalendarEvents() {
    const { isSignedIn } = useUser();

    const { data, mutate, isLoading } = useSWR(
        isSignedIn ? '/api/calendar/events' : null,
        fetcher,
        {
            revalidateOnFocus: true,
            revalidateOnReconnect: true,
            dedupingInterval: 15000,
            shouldRetryOnError: false
        }
    );

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

    const getDateConflict = useCallback((event) => {
        if (!isSignedIn || !event || !event.date) return { hasConflict: false };

        const allIds = [event.id, ...(event._allIds || [])];
        const isSelfMarked = allIds.some(id => markedSet.has(String(id)));
        if (isSelfMarked) {
            return { hasConflict: false, isSelfMarked: true };
        }

        const dateStr = parsePtDate(event.date);
        if (!dateStr) return { hasConflict: false };

        const markedOnSameDate = markedDates[dateStr];
        if (markedOnSameDate) {
            const isSameEvent = allIds.includes(markedOnSameDate.eventId);
            if (!isSameEvent) {
                return {
                    hasConflict: true,
                    conflictingTitle: markedOnSameDate.title,
                    date: dateStr
                };
            }
        }

        return { hasConflict: false };
    }, [isSignedIn, markedSet, markedDates]);

    return {
        isSignedIn,
        markedSet,
        markedDates,
        isMarked,
        getDateConflict,
        refreshCalendar: mutate,
        isLoading
    };
}
