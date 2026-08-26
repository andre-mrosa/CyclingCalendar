"use client";
import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export function useFavorites() {
    const { user, isLoaded, isSignedIn } = useUser();
    const [favorites, setFavorites] = useState(() => {
        if (typeof window !== 'undefined') {
            try {
                const cached = localStorage.getItem('cycling-favorites-cache');
                if (cached) return JSON.parse(cached);
            } catch (e) {}
        }
        return [];
    });
    
    // Sincronizar com os metadados do Clerk e cache local ao carregar
    useEffect(() => {
        if (isLoaded && isSignedIn && user) {
            const hasPendingSync = localStorage.getItem('cycling_pending_favorites_sync') === 'true';
            
            if (hasPendingSync) {
                // Se existirem alterações feitas em modo offline, envia-as para a nuvem
                try {
                    const cached = localStorage.getItem('cycling-favorites-cache');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        user.update({
                            unsafeMetadata: {
                                ...user.unsafeMetadata,
                                favorites: parsed
                            }
                        }).then(() => {
                            localStorage.removeItem('cycling_pending_favorites_sync');
                        }).catch(() => {});
                    }
                } catch (e) {}
            } else if (user?.unsafeMetadata?.favorites && Array.isArray(user.unsafeMetadata.favorites)) {
                setFavorites(user.unsafeMetadata.favorites);
                try {
                    localStorage.setItem('cycling-favorites-cache', JSON.stringify(user.unsafeMetadata.favorites));
                } catch (e) {}
            }
        }
    }, [user, isLoaded, isSignedIn]);

    // Listener para quando a internet volta: sincroniza automaticamente
    useEffect(() => {
        const handleOnline = () => {
            if (isLoaded && isSignedIn && user && localStorage.getItem('cycling_pending_favorites_sync') === 'true') {
                try {
                    const cached = localStorage.getItem('cycling-favorites-cache');
                    if (cached) {
                        const parsed = JSON.parse(cached);
                        user.update({
                            unsafeMetadata: {
                                ...user.unsafeMetadata,
                                favorites: parsed
                            }
                        }).then(() => {
                            localStorage.removeItem('cycling_pending_favorites_sync');
                        }).catch(() => {});
                    }
                } catch (e) {}
            }
        };

        window.addEventListener('online', handleOnline);
        return () => window.removeEventListener('online', handleOnline);
    }, [user, isLoaded, isSignedIn]);

    const toggleFavorite = async (eventId) => {
        if (!eventId) return;

        const isFavorited = favorites.includes(eventId);
        const newFavorites = isFavorited 
            ? favorites.filter(id => id !== eventId)
            : [...favorites, eventId];
        
        // Atualização Local Imediata (funciona 100% offline)
        setFavorites(newFavorites);
        try {
            localStorage.setItem('cycling-favorites-cache', JSON.stringify(newFavorites));
        } catch (e) {}

        if (isSignedIn && user) {
            if (typeof navigator !== 'undefined' && !navigator.onLine) {
                // Guarda para sincronizar quando voltar a ter rede
                try {
                    localStorage.setItem('cycling_pending_favorites_sync', 'true');
                } catch (e) {}
                return;
            }

            try {
                // Guardar no Clerk na nuvem
                await user.update({
                    unsafeMetadata: {
                        ...user.unsafeMetadata,
                        favorites: newFavorites
                    }
                });
                localStorage.removeItem('cycling_pending_favorites_sync');
            } catch (error) {
                // Se a ligação falhar, marca para sincronizar mais tarde sem quebrar a experiência do utilizador
                try {
                    localStorage.setItem('cycling_pending_favorites_sync', 'true');
                } catch (e) {}
            }
        }
    };

    return {
        favorites,
        toggleFavorite,
        isLoaded,
        isSignedIn
    };
}
