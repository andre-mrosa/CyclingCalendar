'use client';
import { useUser } from '@clerk/nextjs';
import { useCallback, useEffect, useMemo } from 'react';
import { readStored, writeStored, useStoredString, useOnline } from './useBrowserState';
import { favoriteCacheKey as keyFor, favoritePendingKey as pendingFor, favoriteExclusionKey,
    parseFavorites as parse, createFavoriteSynchronizer } from '../utils/favoriteSync';
import { useFavoriteEditionPreferences, inheritedFavoriteKey } from './useFavoriteEditions';
import { effectiveEditionIds, editionIdentity, safeFavoriteIds } from '../utils/favoriteEditions';
const sync = createFavoriteSynchronizer({ read: readStored, write: writeStored, online: () => navigator.onLine });
const EMPTY_EVENTS = [];
export function useFavorites(events = EMPTY_EVENTS) {
    const { user, isLoaded, isSignedIn } = useUser();
    const online = useOnline();
    const ready = isLoaded || !online;
    const userId = isSignedIn ? user?.id : null;
    const key = keyFor(userId);
    const exclusionKey = favoriteExclusionKey(userId);
    const inheritedKey = inheritedFavoriteKey(userId);
    const raw = useStoredString(key, '[]');
    const excludedRaw = useStoredString(exclusionKey, '[]');
    const inheritedRaw = useStoredString(inheritedKey, '[]');
    const editionPreferences = useFavoriteEditionPreferences(userId, ready);
    const manualFavorites = useMemo(() => ready ? parse(raw) : [], [raw, ready]);
    const exclusions = useMemo(() => parse(excludedRaw), [excludedRaw]);
    const automaticFavorites = useMemo(() => ready ? effectiveEditionIds(events, manualFavorites, exclusions,
        { addedIds: safeFavoriteIds([...parse(inheritedRaw), ...(editionPreferences.inheritedIds || [])]) }, editionPreferences.follow) : [],
        [events, manualFavorites, exclusions, inheritedRaw, editionPreferences.inheritedIds, editionPreferences.follow, ready]);
    const favorites = useMemo(() => safeFavoriteIds([...manualFavorites, ...automaticFavorites]), [manualFavorites, automaticFavorites]);
    useEffect(() => {
        if (!ready || !events.length) return;
        const next = JSON.stringify(automaticFavorites);
        if (next !== inheritedRaw) writeStored(inheritedKey, next);
    }, [automaticFavorites, inheritedRaw, inheritedKey, ready, events.length]);
    useEffect(() => {
        if (!isLoaded) return;
        if (!userId) {
            if (readStored(key) === null) writeStored(key, JSON.stringify(parse(readStored('cycling_favorites', '[]'))));
            return;
        }
        if (readStored(pendingFor(userId)) === 'true') sync(user);
        else {
            writeStored(key, JSON.stringify(Array.isArray(user.unsafeMetadata?.favorites) ? user.unsafeMetadata.favorites : []));
            writeStored(exclusionKey, JSON.stringify(Array.isArray(user.unsafeMetadata?.favoriteEditionExclusions) ? user.unsafeMetadata.favoriteEditionExclusions : []));
        }
    }, [isLoaded, userId, user, key, exclusionKey]);
    useEffect(() => {
        if (!userId) return;
        const reconnect = () => sync(user);
        window.addEventListener('online', reconnect);
        return () => window.removeEventListener('online', reconnect);
    }, [userId, user]);
    const toggleFavorite = useCallback(eventId => {
        if (!ready || !eventId) return;
        const current = parse(readStored(key, '[]'));
        const excluded = parse(readStored(exclusionKey, '[]'));
        const event = events.find(event => event.id === eventId || event._allIds?.includes(eventId));
        const identity = editionIdentity(event);
        const aliases = new Set([eventId, ...(event?._allIds || [])]);
        const selected = favorites.some(id => aliases.has(id));
        const next = selected ? current.filter(id => !aliases.has(id)) : [...current, eventId];
        const nextExcluded = identity ? (selected ? [...new Set([...excluded, identity.key])] : excluded.filter(key => key !== identity.key)) : excluded;
        if (userId) writeStored(pendingFor(userId), 'true');
        writeStored(key, JSON.stringify(next));
        writeStored(exclusionKey, JSON.stringify(nextExcluded));
        if (userId) sync(user);
    }, [ready, key, exclusionKey, userId, user, events, favorites]);
    return { favorites, manualFavorites, automaticFavorites, toggleFavorite, editionPreferences, isLoaded: ready, isSignedIn };
}
