"use client";

import CalendarView from "../components/CalendarView";
import { useUser } from '@clerk/nextjs';
import { Star } from 'lucide-react';
import { useFavorites } from '../hooks/useFavorites';
import Link from 'next/link';

export default function Favoritos() {
    const { isSignedIn, isLoaded } = useUser();
    const { favorites } = useFavorites();

    if (!isLoaded) {
        return (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '50vh' }}>
                <div className="spinner"></div>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="app-container" style={{ padding: '2rem', textAlign: 'center', marginTop: '4rem' }}>
                <Star size={64} color="var(--text-secondary)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
                <h1 style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Favoritos</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '500px', margin: '0 auto 2rem' }}>
                    Inicia sessão para guardares as provas que não queres perder. Os teus favoritos serão sincronizados em todos os teus dispositivos.
                </p>
                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {/* The SignIn button is handled in the Navigation bar, so we can just prompt them or show a native clerk button */}
                    <p style={{ fontSize: '0.9rem', color: 'var(--accent-primary)', fontWeight: 'bold' }}>
                        ↑ Usa o botão de "Entrar" no topo da página.
                    </p>
                </div>
            </div>
        );
    }

    if (favorites.length === 0) {
        return (
            <div className="app-container" style={{ padding: '2rem', textAlign: 'center', marginTop: '4rem' }}>
                <Star size={64} color="#eab308" style={{ marginBottom: '1.5rem', opacity: 0.8 }} />
                <h1 style={{ fontSize: '2.5rem', marginBottom: '1rem', color: 'var(--text-primary)' }}>Ainda não tens favoritos</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', maxWidth: '600px', margin: '0 auto 2rem', lineHeight: '1.5' }}>
                    Navega pelo calendário e clica na Estrela ⭐ ao lado do nome de qualquer prova para a guardares aqui.
                </p>
                <Link href="/" className="modal-btn primary" style={{ display: 'inline-flex', padding: '0.75rem 2rem' }}>
                    Explorar Calendário
                </Link>
            </div>
        );
    }

    return (
        <CalendarView 
            pageTitle="As Tuas Provas Guardadas"
            pageSubtitle={`${favorites.length} ${favorites.length === 1 ? 'prova selecionada' : 'provas selecionadas'}`}
            filterByFavorites={true}
            // Removemos os filtros de pesquisa de meses para não esconder as provas guardadas sem querer
            activeFilters={['search', 'escalao', 'ambito', 'regiao']} 
            applyDefaultRegiao={false} // Não queremos forçar a região nos favoritos
        />
    );
}
