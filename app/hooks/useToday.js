'use client';

import { useSyncExternalStore } from 'react';
import { lisbonWallClock } from '../utils/planning';

const getToday = () => lisbonWallClock().slice(0, 10);
const getServerToday = () => '';
const subscribe = callback => {
    const timer = window.setInterval(callback, 1000);
    window.addEventListener('focus', callback);
    document.addEventListener('visibilitychange', callback);
    return () => {
        window.clearInterval(timer);
        window.removeEventListener('focus', callback);
        document.removeEventListener('visibilitychange', callback);
    };
};

// A stable date snapshot updates the list only when the Lisbon calendar day changes.
export const useToday = () => useSyncExternalStore(subscribe, getToday, getServerToday);
