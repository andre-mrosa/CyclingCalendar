'use client';
import { useCallback, useSyncExternalStore } from 'react';
const noopSubscribe = () => () => {};
export const useClientReady = () => useSyncExternalStore(noopSubscribe, () => true, () => false);
const subscribeOnline = callback => {
    window.addEventListener('online', callback); window.addEventListener('offline', callback);
    return () => { window.removeEventListener('online', callback); window.removeEventListener('offline', callback); };
};
export const useOnline = () => useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
const memory = new Map();
export function readStored(key, fallback = null) {
    try { return localStorage.getItem(key) ?? memory.get(key) ?? fallback; }
    catch { return memory.get(key) ?? fallback; }
}
export function writeStored(key, value) {
    memory.set(key, value);
    try { localStorage.setItem(key, value); } catch {}
    window.dispatchEvent(new Event('cycling-storage'));
}
const subscribeStorage = callback => {
    window.addEventListener('storage', callback); window.addEventListener('cycling-storage', callback);
    return () => { window.removeEventListener('storage', callback); window.removeEventListener('cycling-storage', callback); };
};
export function useStoredString(key, fallback = '') {
    return useSyncExternalStore(subscribeStorage, useCallback(() => readStored(key, fallback), [key, fallback]), () => fallback);
}
