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
            <div className="flex justify-center items-center h-[50vh]">
                <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!isSignedIn) {
        return (
            <div className="max-w-xl mx-auto py-16 px-4 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
                    <Star size={32} className="text-amber-500 dark:text-amber-400 opacity-60" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Favoritos</h1>
                <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-6">
                    Inicia sessão para guardares as provas que não queres perder. Os teus favoritos serão sincronizados em todos os teus dispositivos.
                </p>
                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl inline-block shadow-sm">
                    <p className="text-sm text-blue-600 dark:text-blue-400 font-semibold m-0">
                        ↑ Usa o botão de "Entrar" no topo da página.
                    </p>
                </div>
            </div>
        );
    }

    if (favorites.length === 0) {
        return (
            <div className="max-w-xl mx-auto py-16 px-4 text-center">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-6">
                    <Star size={32} className="text-amber-500 dark:text-amber-400" />
                </div>
                <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-3">Ainda não tens favoritos</h1>
                <p className="text-slate-600 dark:text-slate-400 text-base leading-relaxed mb-8">
                    Navega pelo calendário e clica na Estrela ⭐ ao lado do nome de qualquer prova para a guardares aqui.
                </p>
                <Link href="/" className="inline-flex items-center justify-center px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-xl transition-colors shadow-lg shadow-blue-500/20">
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
