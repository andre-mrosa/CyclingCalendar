"use client";

import { useUser } from '@clerk/nextjs';
import { useState, useEffect, useCallback, useMemo } from 'react';

const getCacheKey = (userId) => userId ? `cycling_favorites_${userId}` : 'cycling_favorites_guest';

export function useFavorites() {
    const { user, isLoaded, isSignedIn } = useUser();
    const userId = isSignedIn && user ? user.id : null;
    
    // Inicialização segura baseada no utilizador atual
    const [favorites, setFavorites] = useState([]);

    // Sincronização ao carregar ou trocar de utilizador
    useEffect(() => {
        if (!isLoaded) return;

        // Limpeza de cache legado global não segmentado por utilizador
        if (typeof window !== 'undefined') {
            try {
                localStorage.removeItem('cycling-favorites-cache');
            } catch (e) {}
        }

        if (!isSignedIn || !user) {
            setFavorites([]);
            return;
        }

        const cacheKey = getCacheKey(user.id);
        const pendingKey = `cycling_pending_favs_sync_${user.id}`;
        const hasPendingSync = typeof window !== 'undefined' && localStorage.getItem(pendingKey) === 'true';

        if (hasPendingSync) {
            try {
                const cached = localStorage.getItem(cacheKey);
                if (cached) {
                    const parsed = JSON.parse(cached);
                    if (Array.isArray(parsed)) {
                        setFavorites(parsed);
                        user.update({
                            unsafeMetadata: {
                                ...user.unsafeMetadata,
                                favorites: parsed
                            }
                        }).then(() => {
                            localStorage.removeItem(pendingKey);
                        }).catch(() => {});
                        return;
                    }
                }
            } catch (e) {}
        }

        // Ler diretamente dos metadados do utilizador autenticado no Clerk
        if (user.unsafeMetadata?.favorites && Array.isArray(user.unsafeMetadata.favorites)) {
            setFavorites(user.unsafeMetadata.favorites);
            try {
                localStorage.setItem(cacheKey, JSON.stringify(user.unsafeMetadata.favorites));
            } catch (e) {}
        } else {
            // Utilizador novo sem favoritos
            setFavorites([]);
            try {
                localStorage.setItem(cacheKey, JSON.stringify([]));
            } catch (e) {}
        }
    }, [user, isLoaded, isSignedIn]);

    // Listener para quando a internet volta: sincroniza automaticamente
    useEffect(() => {
        const handleOnline = () => {
            if (isLoaded && isSignedIn && user) {
                const cacheKey = getCacheKey(user.id);
                const pendingKey = `cycling_pending_favs_sync_${user.id}`;
                if (localStorage.getItem(pendingKey) === 'true') {
                    try {
                        const cached = localStorage.getItem(cacheKey);
                        if (cached) {
                            const parsed = JSON.parse(cached);
                            user.update({
                                unsafeMetadata: {
                                    ...user.unsafeMetadata,
                                    favorites: parsed
                                }
                            }).then(() => {
                                localStorage.removeItem(pendingKey);
                            }).catch(() => {});
                        }
                    } catch (e) {}
                }
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [user, isLoaded, isSignedIn]);

    const toggleFavorite = useCallback(async (eventId) => {
        if (!eventId) return;

        setFavorites(currentFavs => {
            const isFavorited = currentFavs.includes(eventId);
            const newFavorites = isFavorited 
                ? currentFavs.filter(id => id !== eventId)
                : [...currentFavs, eventId];

            if (isSignedIn && user) {
                const cacheKey = getCacheKey(user.id);
                const pendingKey = `cycling_pending_favs_sync_${user.id}`;
                
                try {
                    localStorage.setItem(cacheKey, JSON.stringify(newFavorites));
                } catch (e) {}

                if (typeof navigator !== 'undefined' && !navigator.onLine) {
                    try {
                        localStorage.setItem(pendingKey, 'true');
                    } catch (e) {}
                } else {
                    user.update({
                        unsafeMetadata: {
                            ...user.unsafeMetadata,
                            favorites: newFavorites
                        }
                    }).then(() => {
                        localStorage.removeItem(pendingKey);
                    }).catch(() => {
                        try {
                            localStorage.setItem(pendingKey, 'true');
                        } catch (e) {}
                    });
                }
            }

            return newFavorites;
        });
    }, [isSignedIn, user]);

    return {
        favorites,
        toggleFavorite,
        isLoaded,
        isSignedIn
    };
}
