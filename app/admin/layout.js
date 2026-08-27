'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, AlertTriangle, Users, FileText, Activity, RefreshCw } from 'lucide-react';
import { useUser } from '@clerk/nextjs';

export default function AdminLayout({ children }) {
    const { isLoaded, isSignedIn, user } = useUser();
    const [adminData, setAdminData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    // 1. Verificação abrangente e instantânea no lado do cliente
    const userEmails = [
        user?.primaryEmailAddress?.emailAddress,
        user?.email,
        ...(user?.emailAddresses || []).map(e => typeof e === 'string' ? e : e?.emailAddress),
        ...(user?.externalAccounts || []).map(a => a?.emailAddress)
    ].filter(Boolean).map(e => String(e).toLowerCase().trim());

    const primaryEmail = userEmails[0] || '';
    const masterList = ['andre.rosa1603@gmail.com', 'andremrosa@gmail.com', 'andre_rosa', 'andrerosa', 'user_3HoiHwpGl9suYXrYx0QFhDMXHWD'];
    
    const isMaster = !!user && (
        masterList.includes(user.id) ||
        userEmails.some(e => masterList.some(m => e === m || e.includes(m) || m.includes(e))) ||
        (user.username && masterList.some(m => user.username.toLowerCase().includes(m)))
    );
    const hasAdminRole = user?.publicMetadata?.role === 'admin';
    const isLocalAdmin = isMaster || hasAdminRole;

    const verifyAdmin = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/admin/me');
            const data = await res.json();
            if (data.success) {
                setAdminData(data);
            }
        } catch (e) {
            console.error('Error verifying admin access:', e);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (!isLoaded) return;
        
        if (!isSignedIn) {
            setIsLoading(false);
            return;
        }

        verifyAdmin();
    }, [isLoaded, isSignedIn]);

    const isAuthorized = isLocalAdmin || adminData?.isAdmin;
    const displayIsMaster = isMaster || adminData?.isMaster;
    const displayName = adminData?.user?.name || user?.fullName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin';
    const displayEmail = adminData?.user?.email || primaryEmail;

    // Se já sabemos localmente que é o Master Admin, não bloqueia com spinner nem com erro
    if (!isLoaded || (isLoading && !isLocalAdmin)) {
        return (
            <div className="min-h-[80vh] flex flex-col items-center justify-center gap-3 text-slate-400">
                <div className="w-8 h-8 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin"></div>
                <p className="text-sm font-medium">A verificar credenciais de acesso...</p>
            </div>
        );
    }

    if (!isSignedIn || !isAuthorized) {
        return (
            <div className="min-h-[80vh] max-w-lg mx-auto px-4 flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-500 flex items-center justify-center mb-4 shadow-lg shadow-rose-500/5">
                    <Lock size={32} />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
                    Acesso Restrito
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-sm mb-4 leading-relaxed">
                    Esta área é reservada à equipa de administração do Cycling Calendar.
                </p>

                {isSignedIn ? (
                    <div className="mb-6 p-3.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-400 font-mono text-left w-full space-y-1">
                        <div>Email: <strong className="text-slate-900 dark:text-slate-200">{primaryEmail || 'Sem email detetado'}</strong></div>
                        <div className="text-[11px] truncate">ID: {user?.id}</div>
                        <div className="mt-2 text-amber-600 dark:text-amber-400 font-bold text-xs">⚠️ Esta conta não possui privilégios de administrador. Inicia sessão com a tua conta principal.</div>
                    </div>
                ) : (
                    <div className="mb-6 p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 font-bold">
                        ⚠️ Sessão não iniciada neste dispositivo. Inicia sessão primeiro.
                    </div>
                )}

                <div className="flex flex-wrap items-center justify-center gap-3">
                    <button
                        onClick={verifyAdmin}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer"
                    >
                        <RefreshCw size={14} />
                        <span>Verificar Novamente</span>
                    </button>
                    <Link 
                        href="/" 
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all !no-underline"
                    >
                        <ArrowLeft size={14} />
                        <span>Voltar ao Início</span>
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
                            displayIsMaster 
                                ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                        }`}>
                            <span>{displayIsMaster ? '👑 Master Admin' : '🛡️ Administrador'}</span>
                        </span>
                        
                        <div className="hidden sm:block text-right">
                            <span className="text-xs font-semibold block text-slate-800 dark:text-slate-200 leading-tight">
                                {displayName}
                            </span>
                            <span className="text-[10px] text-slate-500 dark:text-slate-400 block leading-tight">
                                {displayEmail}
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
