'use client';
import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo } from 'react';
import { readStored, writeStored, useStoredString, useOnline } from './useBrowserState';
import { favoriteCacheKey as keyFor, favoritePendingKey as pendingFor, parseFavorites as parse, createFavoriteSynchronizer } from '../utils/favoriteSync';
const sync = createFavoriteSynchronizer({ read: readStored, write: writeStored, online: () => navigator.onLine });
export function useFavorites() {
    const { user, isLoaded, isSignedIn } = useUser();
    const online = useOnline();
    // Offline cold starts cannot load Clerk. Only the separate guest store is
    // available until an authenticated identity has actually been resolved.
    const ready = isLoaded || !online;
    const userId = isSignedIn ? user?.id : null;
    const key = keyFor(userId);
    const raw = useStoredString(key, '[]');
    const favorites = useMemo(() => ready ? parse(raw) : [], [raw, ready]);
    useEffect(() => {
        if (!isLoaded) return;
        if (!userId) {
            if (readStored(key) === null) writeStored(key, JSON.stringify(parse(readStored('cycling_favorites', '[]'))));
            return;
        }
        if (readStored(pendingFor(userId)) === 'true') sync(user);
        else writeStored(key, JSON.stringify(Array.isArray(user.unsafeMetadata?.favorites) ? user.unsafeMetadata.favorites : []));
    }, [isLoaded, userId, user, key]);
    useEffect(() => {
        if (!userId) return;
        const reconnect = () => sync(user);
        window.addEventListener('online', reconnect);
        return () => window.removeEventListener('online', reconnect);
    }, [userId, user]);
    const toggleFavorite = useCallback(eventId => {
        if (!ready || !eventId) return;
        const current = parse(readStored(key, '[]'));
        const next = current.includes(eventId) ? current.filter(id => id !== eventId) : [...current, eventId];
        if (userId) writeStored(pendingFor(userId), 'true');
        writeStored(key, JSON.stringify(next));
        if (userId) sync(user);
    }, [ready, key, userId, user]);
    return { favorites, toggleFavorite, isLoaded: ready, isSignedIn };
}
