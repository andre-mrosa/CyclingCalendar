'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Shield, ArrowLeft, Lock, AlertTriangle, Users, FileText, Activity, RefreshCw } from 'lucide-react';
import { useUser, useAuth } from '@clerk/nextjs';

export default function AdminLayout({ children }) {
    const { isLoaded, isSignedIn, user } = useUser();
    const { getToken } = useAuth();
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
            const token = await getToken().catch(() => null);
            const res = await fetch('/api/admin/me', {
                headers: {
                    'Accept': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                }
            });
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
                    <div className="mb-6 p-4 rounded-xl bg-slate-100 dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-xs text-slate-700 dark:text-slate-300 font-mono text-left w-full space-y-1.5 shadow-sm">
                        <div className="font-bold text-slate-900 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-1 mb-2">
                            🔍 Diagnóstico de Conta (Dispositivo Atual):
                        </div>
                        <div>Email: <strong className="text-blue-600 dark:text-blue-400">{primaryEmail || user?.primaryEmailAddress?.emailAddress || 'Sem email'}</strong></div>
                        <div className="text-[11px] truncate">ID: {user?.id || 'Sem ID'}</div>
                        <div className="text-[11px]">Username: {user?.username || 'Sem username'}</div>
                        <div className="text-[11px]">Nome: {user?.fullName || 'Sem nome'}</div>
                        <div className="text-[11px] break-all text-slate-500">Emails detetados: {JSON.stringify(userEmails)}</div>
                        
                        <div className="mt-3 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 font-sans font-semibold text-xs">
                            ⚠️ Se esta é a tua conta Master Admin, confirma se o email acima corresponde exatamente a <code>andre.rosa1603@gmail.com</code> ou <code>andremrosa@gmail.com</code>.
                        </div>
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
            <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-6">
                {children}
            </main>
        </div>
    );
}
