'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, AlertTriangle, Users, FileText, Activity, RefreshCw } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function AdminLayout({ children }) {
    const { isLoaded, isSignedIn, user } = useUser();
    const [adminData, setAdminData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!isLoaded) return;
        
        if (!isSignedIn) {
            setIsLoading(false);
            return;
        }

        const verifyAdmin = async () => {
            try {
                const res = await fetch('/api/admin/me');
                const data = await res.json();
                setAdminData(data);
            } catch (e) {
                console.error('Error verifying admin access:', e);
            } finally {
                setIsLoading(false);
            }
        };

        verifyAdmin();
    }, [isLoaded, isSignedIn]);

    if (!isLoaded || isLoading) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-sm font-medium">A verificar credenciais de acesso...</p>
            </div>
        );
    }

    if (!isSignedIn || !adminData?.isAdmin) {
        return (
            <div className="min-h-[80vh] max-w-lg mx-auto px-4 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/5">
                    <Lock size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Acesso Restrito
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-6 leading-relaxed">
                    Esta área é reservada à equipa de administração do Cycling Calendar. Se acreditas que deverias ter acesso, contacta o Master Admin da plataforma.
                </p>
                <div className="flex items-center gap-3">
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-900 text-sm font-bold shadow-md transition-all !no-underline"
                    >
                        <ArrowLeft size={16} />
                        Voltar ao Calendário
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
            {/* Top Admin Header Bar */}
            <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-8 py-3">
                <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Link 
                            href="/" 
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Voltar ao site público"
                        >
                            <ArrowLeft size={18} />
                        </Link>
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                                <Shield size={16} />
                            </div>
                            <div>
                                <h1 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white leading-none">
                                    Painel de Gestão
                                </h1>
                                <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                                    Cycling Calendar Backoffice
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold ${
                            adminData.isMaster 
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        }`}>
                            <span>{adminData.isMaster ? '👑 Master Admin' : '🛡️ Administrador'}</span>
                        </span>
                        
                        <div className="hidden sm:block text-right">
                            <span className="text-xs font-semibold block text-slate-800 dark:text-slate-200 leading-tight">
                                {adminData.user?.name}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                                {adminData.user?.email}
                            </span>
                        </div>
                    </div>
                </div>
            </header>

            {/* Main Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
                {children}
            </main>
        </div>
    );
}
