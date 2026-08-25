"use client";
import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export function useFavorites() {
    const { user, isLoaded, isSignedIn } = useUser();
    const [favorites, setFavorites] = useState([]);
    
    // Sincronizar com os metadados do Clerk e cache local ao carregar
    useEffect(() => {
        if (isLoaded && isSignedIn) {
            if (user?.unsafeMetadata?.favorites && Array.isArray(user.unsafeMetadata.favorites)) {
                setFavorites(user.unsafeMetadata.favorites);
                try {
                    localStorage.setItem('cycling-favorites-cache', JSON.stringify(user.unsafeMetadata.favorites));
                } catch (e) {}
            } else {
                try {
                    const cached = localStorage.getItem('cycling-favorites-cache');
                    if (cached) setFavorites(JSON.parse(cached));
                } catch (e) {}
            }
        } else if (isLoaded && !isSignedIn) {
            setFavorites([]);
        }
    }, [user, isLoaded, isSignedIn]);

    const toggleFavorite = async (eventId) => {
        if (!eventId) return;
        if (!isSignedIn || !user) {
            alert('Precisas de iniciar sessão para guardar favoritos!');
            return;
        }

        const isFavorited = favorites.includes(eventId);
        const newFavorites = isFavorited 
            ? favorites.filter(id => id !== eventId)
            : [...favorites, eventId];
        
        // Atualização Otimista UI (imediata)
        setFavorites(newFavorites);
        try {
            localStorage.setItem('cycling-favorites-cache', JSON.stringify(newFavorites));
        } catch (e) {}

        try {
            // Guardar no Clerk
            await user.update({
                unsafeMetadata: {
                    ...user.unsafeMetadata,
                    favorites: newFavorites
                }
            });
        } catch (error) {
            console.error('Erro ao guardar favorito no Clerk:', error);
            // Reverter estado se falhar
            setFavorites(favorites);
            alert('Não foi possível guardar o favorito na nuvem. Tenta novamente.');
        }
    };

    return {
        favorites,
        toggleFavorite,
        isLoaded,
        isSignedIn
    };
}
