"use client";
import { useUser } from '@clerk/nextjs';
import { useState, useEffect } from 'react';

export function useFavorites() {
    const { user, isLoaded, isSignedIn } = useUser();
    const [favorites, setFavorites] = useState([]);
    
    // Sincronizar com os metadados do Clerk ao carregar
    useEffect(() => {
        if (isLoaded && isSignedIn && user?.unsafeMetadata?.favorites) {
            setFavorites(user.unsafeMetadata.favorites);
        } else if (isLoaded && !isSignedIn) {
            setFavorites([]);
        }
    }, [user, isLoaded, isSignedIn]);

    const toggleFavorite = async (eventId) => {
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
