'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { 
    Users, FileText, Activity, Shield, AlertTriangle, CheckCircle2, 
    XCircle, Info, RefreshCw, Search, Trash2, Download, ExternalLink, 
    Clock, Calendar, UserCheck, UserX, Database, Play, Check, ChevronDown, ChevronRight, Copy, RotateCcw,
    LayoutDashboard, Globe, Smartphone, Monitor, Tablet, Eye, TrendingUp, Compass, Flame, MapPin, MousePointerClick, Radio, Sparkles, Terminal
} from 'lucide-react';

function getCountryFlag(countryCode) {
    if (!countryCode || countryCode === 'Desconhecido') return '🌍';
    const code = countryCode.toUpperCase();
    if (code === 'PT') return '🇵🇹';
    if (code === 'ES') return '🇪🇸';
    if (code === 'FR') return '🇫🇷';
    if (code === 'GB' || code === 'UK') return '🇬🇧';
    if (code === 'US') return '🇺🇸';
    if (code === 'BR') return '🇧🇷';
    if (code === 'DE') return '🇩🇪';
    if (code === 'IT') return '🇮🇹';
    if (code === 'NL') return '🇳🇱';
    if (code === 'CH') return '🇨🇭';
    if (code === 'BE') return '🇧🇪';
    if (code.length === 2) {
        const offset = 127397;
        return String.fromCodePoint(...[...code].map(c => c.charCodeAt(0) + offset));
    }
    return '🌍';
}

function formatTimeAgo(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    const now = new Date();
    const diffSec = Math.floor((now - date) / 1000);
    if (diffSec < 60) return 'agora mesmo';
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `há ${diffMin} min`;
    const diffHours = Math.floor(diffMin / 60);
    if (diffHours < 24) return `há ${diffHours}h`;
    const diffDays = Math.floor(diffHours / 24);
    return `há ${diffDays}d`;
}

export default function AdminDashboardPage() {
    const { isLoaded, isSignedIn, user } = useUser();
    const { getToken } = useAuth();
    const [activeTab, setActiveTab] = useState('stats'); // 'stats' | 'users' | 'logs' | 'operations'
    const [apiError, setApiError] = useState(null);
    
    // Authenticated fetch wrapper with Bearer token and automatic 401 retry
    const authFetch = useCallback(async (url, options = {}, retries = 2) => {
        let token = null;
        try {
            token = await getToken({ skipCache: retries < 2 });
        } catch (e) {
            console.error('Error obtaining Clerk token:', e);
        }

        const headers = {
            'Accept': 'application/json',
            ...(options.headers || {}),
            ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        };

        const res = await fetch(url, {
            ...options,
            headers
        });

        if (res.status === 401 && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 600));
            return authFetch(url, options, retries - 1);
        }

        return res;
    }, [getToken]);

    // Stats & Analytics State
    const [stats, setStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLiveRefreshing, setIsLiveRefreshing] = useState(false);
    const [autoRefreshStats, setAutoRefreshStats] = useState(true);
    const [analyticsTimeframe, setAnalyticsTimeframe] = useState('7d'); // '24h' | '7d' | '30d' | 'all'

    // Users State
    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('ALL'); // 'ALL' | 'admin' | 'user' | 'deletions'
    const [roleChangeTarget, setRoleChangeTarget] = useState(null); // { user, newRole }
    const [isUpdatingRole, setIsUpdatingRole] = useState(false);
    const [roleActionMsg, setRoleActionMsg] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null); // { user, mode: 'delete_data' | 'delete_account' }
    const [isDeletingUser, setIsDeletingUser] = useState(false);
    const [deleteActionMsg, setDeleteActionMsg] = useState(null);
    const [pendingDeletionsCount, setPendingDeletionsCount] = useState(0);

    // Logs State
    const [logs, setLogs] = useState([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logLevelFilter, setLogLevelFilter] = useState('ALL');
    const [logSourceFilter, setLogSourceFilter] = useState('ALL');
    const [logSearch, setLogSearch] = useState('');
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
    const [copiedLogId, setCopiedLogId] = useState(null);
    const [isClearingLogs, setIsClearingLogs] = useState(false);

    // Operations State & Live Progress
    const [runningOp, setRunningOp] = useState(null);
    const [opOutput, setOpOutput] = useState(null);
    const [liveScraperLogs, setLiveScraperLogs] = useState([]);
    const [scraperElapsedSecs, setScraperElapsedSecs] = useState(0);
    const [scraperActiveStep, setScraperActiveStep] = useState(0); // 0: None, 1: FPC, 2: Cabreira, 3: Stop&Go, 4: DeepScrape, 5: Unificação, 6: Concluído
    const [scraperStepDurations, setScraperStepDurations] = useState({}); // { 1: '9.2s', 2: '11.4s', ... }
    const [scraperSources, setScraperSources] = useState(null);
    const [scraperSteps, setScraperSteps] = useState(null);
    const stepStartTimesRef = useRef({});
    const lastStepRef = useRef(0);

    // 1. Fetch Stats & Analytics (with smart background silent refresh)
    const loadStats = useCallback(async (timeframeParam, silent = false) => {
        const tf = timeframeParam || analyticsTimeframe;
        if (!silent) setIsLoadingStats(true);
        else setIsLiveRefreshing(true);

        try {
            const res = await authFetch(`/api/admin/stats?timeframe=${tf}`);
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = { success: false, error: text || `Erro no servidor (${res.status})` };
            }

            if (data.success) {
                setStats(data.stats);
                setApiError(null);
            } else {
                console.error('Stats error:', data.error);
                if (!silent) setApiError(`Estatísticas: ${data.error || 'Erro no servidor'}`);
            }
        } catch (e) {
            console.error('Error loading stats:', e);
            if (!silent) setApiError(`Estatísticas: ${e.message}`);
        } finally {
            if (!silent) setIsLoadingStats(false);
            else setIsLiveRefreshing(false);
        }
    }, [authFetch, analyticsTimeframe]);

    // 2. Fetch Users
    const loadUsers = useCallback(async () => {
        setIsLoadingUsers(true);
        try {
            const res = await authFetch('/api/admin/users');
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = { success: false, error: text || `Erro no servidor (${res.status})` };
            }

            if (data.success) {
                setUsers(data.users || []);
                setPendingDeletionsCount(data.pendingDeletionsCount || 0);
                setApiError(null);
            } else {
                console.error('Users error:', data.error);
                setApiError(`Utilizadores: ${data.error || 'Erro no servidor'}`);
            }
        } catch (e) {
            console.error('Error loading users:', e);
            setApiError(`Utilizadores: ${e.message}`);
        } finally {
            setIsLoadingUsers(false);
        }
    }, [authFetch]);

    // 3. Fetch Logs
    const loadLogs = useCallback(async () => {
        setIsLoadingLogs(true);
        try {
            const params = new URLSearchParams();
            if (logLevelFilter !== 'ALL') params.set('level', logLevelFilter);
            if (logSourceFilter !== 'ALL') params.set('source', logSourceFilter);
            if (logSearch.trim()) params.set('search', logSearch.trim());
            params.set('limit', '150');

            const res = await authFetch(`/api/admin/logs?${params.toString()}`);
            const text = await res.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch {
                data = { success: false, error: text || `Erro no servidor (${res.status})` };
            }

            if (data.success) {
                setLogs(data.logs || []);
                setApiError(null);
            } else {
                console.error('Logs error:', data.error);
                setApiError(`Logs: ${data.error || 'Erro no servidor'}`);
            }
        } catch (e) {
            console.error('Error loading logs:', e);
            setApiError(`Logs: ${e.message}`);
        } finally {
            setIsLoadingLogs(false);
        }
    }, [authFetch, logLevelFilter, logSourceFilter, logSearch]);

    // Set permanent admin device flag (Mobile and Desktop)
    useEffect(() => {
        if (typeof window !== 'undefined') {
            try {
                localStorage.setItem('cc_admin_device', 'true');
                document.cookie = "cc_admin_device=1; path=/; max-age=31536000; SameSite=Lax";
            } catch {}
        }
    }, []);

    // Check if a scraping pipeline is currently running on the server (e.g. on mount or after F5)
    const checkScraperRunningStatus = useCallback(async () => {
        try {
            const res = await authFetch('/api/admin/scraper-status');
            if (!res.ok) return;
            const data = await res.json();
            if (data.success && data.isRunning) {
                setRunningOp('unified_scrape');
                setScraperActiveStep(data.activeStep || 1);
                setScraperElapsedSecs(data.elapsedSeconds || 0);
                if (data.sources) setScraperSources(data.sources);
                if (data.steps) setScraperSteps(data.steps);
                if (data.stepDurations) setScraperStepDurations(data.stepDurations);
                if (data.logs) setLiveScraperLogs(data.logs);
                setOpOutput({
                    label: 'Sincronização & Scraping Completo',
                    status: 'loading',
                    message: 'Pipeline em execução no servidor (progresso ativo restaurado).'
                });
                stepStartTimesRef.current = { 1: data.startTime || Date.now() };
                lastStepRef.current = data.activeStep || 1;
            }
        } catch (e) {
            console.error('Error checking scraper running status:', e);
        }
    }, [authFetch]);

    // Initial load once user session is loaded
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        checkScraperRunningStatus();
        if (activeTab === 'stats' || activeTab === 'operations') {
            loadStats();
            loadUsers();
        }
        if (activeTab === 'users') {
            loadUsers();
            loadStats();
        }
        if (activeTab === 'logs') loadLogs();
    }, [isLoaded, isSignedIn, activeTab, loadStats, loadUsers, loadLogs, checkScraperRunningStatus]);

    // Smart Low-Traffic Auto-Refresh for Stats (15s, stops when tab is backgrounded)
    useEffect(() => {
        if (!autoRefreshStats || activeTab !== 'stats') return;

        const interval = setInterval(() => {
            if (typeof document !== 'undefined' && document.visibilityState === 'visible') {
                loadStats(analyticsTimeframe, true);
            }
        }, 15000);

        return () => clearInterval(interval);
    }, [autoRefreshStats, activeTab, analyticsTimeframe, loadStats]);

    // Auto-refresh logs timer
    useEffect(() => {
        if (!autoRefreshLogs || activeTab !== 'logs') return;
        const interval = setInterval(() => {
            loadLogs();
        }, 10000);
        return () => clearInterval(interval);
    }, [autoRefreshLogs, activeTab, loadLogs]);

    // Role update action
    const handleUpdateRole = async () => {
        if (!roleChangeTarget) return;
        setIsUpdatingRole(true);
        setRoleActionMsg(null);
        try {
            const res = await authFetch(`/api/admin/users/${roleChangeTarget.user.id}/role`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ newRole: roleChangeTarget.newRole })
            });
            const data = await res.json();
            if (data.success) {
                setRoleActionMsg({ type: 'success', text: data.message });
                await loadUsers();
                await loadStats();
                setTimeout(() => setRoleChangeTarget(null), 1200);
            } else {
                setRoleActionMsg({ type: 'error', text: data.error || 'Erro ao alterar cargo.' });
            }
        } catch (e) {
            setRoleActionMsg({ type: 'error', text: e.message || 'Erro de rede.' });
        } finally {
            setIsUpdatingRole(false);
        }
    };

    // Clear logs action
    const handleClearLogs = async (clearAll = false) => {
        if (!window.confirm(clearAll ? 'Tem a certeza que deseja eliminar TODOS os logs do sistema?' : 'Eliminar logs com mais de 30 dias?')) return;
        setIsClearingLogs(true);
        try {
            const res = await authFetch(`/api/admin/logs?${clearAll ? 'all=true' : 'days=30'}`, { method: 'DELETE' });
            const data = await res.json();
            if (data.success) {
                await loadLogs();
                await loadStats();
            }
        } catch (e) {
            console.error('Error clearing logs:', e);
        } finally {
            setIsClearingLogs(false);
        }
    };

    // Active pipeline polling loop (handles both user click and F5 refresh resume)
    useEffect(() => {
        if (!runningOp) return;

        const timerInterval = setInterval(() => {
            setScraperElapsedSecs(prev => prev + 1);
        }, 1000);

        const pollStatus = async () => {
            try {
                const res = await authFetch('/api/admin/scraper-status');
                if (!res.ok) return;
                const data = await res.json();
                if (data.success) {
                    if (data.logs) setLiveScraperLogs(data.logs);
                    if (data.sources) setScraperSources(data.sources);
                    if (data.steps) setScraperSteps(data.steps);
                    if (data.stepDurations) setScraperStepDurations(prev => ({ ...prev, ...data.stepDurations }));
                    if (data.elapsedSeconds !== undefined) setScraperElapsedSecs(data.elapsedSeconds);

                    if (data.isRunning) {
                        setScraperActiveStep(data.activeStep || 1);
                        lastStepRef.current = data.activeStep || 1;
                    } else if (data.completed) {
                        // Truly finished on the server!
                        setScraperActiveStep(6);
                        if (data.sources) setScraperSources(data.sources);
                        if (data.steps) setScraperSteps(data.steps);
                        if (data.stepDurations) setScraperStepDurations(data.stepDurations);
                        setOpOutput({
                            label: 'Sincronização & Scraping Completo',
                            status: data.status || 'success',
                            message: data.message || `Operação concluída com sucesso (${data.durationSeconds}s).`,
                            raw: data
                        });
                        setRunningOp(null);
                        await loadStats(null, true);
                        await loadLogs();
                    }
                }
            } catch (err) {
                // Silent poll error
            }
        };

        pollStatus();
        const pollInterval = setInterval(pollStatus, 1500);

        return () => {
            clearInterval(timerInterval);
            clearInterval(pollInterval);
        };
    }, [runningOp, authFetch, loadStats, loadLogs]);

    // Run Scraper / Maintenance Operation
    const handleRunOperation = async (opKey, endpoint, label) => {
        setRunningOp(opKey);
        setScraperElapsedSecs(0);
        setScraperActiveStep(1);
        setLiveScraperLogs([]);
        setScraperStepDurations({});
        setScraperSources({
            fpc: { id: 'fpc', name: 'FPCiclismo', desc: 'Calendários FPC 26/27', status: 'running', duration: null, count: 0, message: 'A recolher...' },
            cabreira: { id: 'cabreira', name: 'Cabreira Solutions', desc: 'Granfondos & Provas', status: 'running', duration: null, count: 0, message: 'A recolher...' },
            stopandgo: { id: 'stopandgo', name: 'Stop & Go', desc: 'Sitemap Ciclismo/BTT', status: 'running', duration: null, count: 0, message: 'A recolher...' },
            classificacoes: { id: 'classificacoes', name: 'Classificações.net', desc: 'Rankings & PDFs', status: 'running', duration: null, count: 0, message: 'A recolher...' }
        });
        setScraperSteps({
            deepScrape: { id: 'deepScrape', name: 'Deep Scraping FPC', desc: 'Programas & Cartazes', status: 'idle', duration: null, count: 0, message: 'Pendente' },
            unification: { id: 'unification', name: 'Unificação & Fusão', desc: 'Deduplicação Multi-Fonte', status: 'idle', duration: null, count: 0, message: 'Pendente' },
            translation: { id: 'translation', name: 'Tradução Multilíngue', desc: 'EN / ES / FR', status: 'idle', duration: null, count: 0, message: 'Pendente' }
        });
        stepStartTimesRef.current = { 1: Date.now() };
        lastStepRef.current = 1;
        setOpOutput({ label, status: 'loading', message: `A executar "${label}"... O pipeline está a recolher calendários e a fundir as provas.` });

        try {
            // Trigger server operation (non-blocking fetch)
            authFetch(endpoint).catch(e => console.log('Background request triggered:', e.message));
        } catch (e) {
            console.error('Trigger error:', e);
        }
    };

    // Copy log details
    const handleCopyLog = (log) => {
        const text = `[${log.createdAt}] [${log.level}] [${log.source}]\n${log.message}\n\nDetalhes:\n${log.details || 'Nenhum'}`;
        navigator.clipboard.writeText(text);
        setCopiedLogId(log.id);
        setTimeout(() => setCopiedLogId(null), 2000);
    };

    // Delete user data or permanent account action
    const handleExecuteUserDeletion = async () => {
        if (!deleteTarget) return;
        setIsDeletingUser(true);
        setDeleteActionMsg(null);
        try {
            const res = await authFetch(`/api/admin/users/${deleteTarget.user.id}?mode=${deleteTarget.mode}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setDeleteActionMsg({ type: 'success', text: data.message });
                await loadUsers();
                await loadStats();
                setTimeout(() => setDeleteTarget(null), 1200);
            } else {
                setDeleteActionMsg({ type: 'error', text: data.error || 'Erro ao processar eliminação.' });
            }
        } catch (e) {
            setDeleteActionMsg({ type: 'error', text: e.message || 'Erro de rede.' });
        } finally {
            setIsDeletingUser(false);
        }
    };

    // Filtered Users List
    const filteredUsers = useMemo(() => {
        return users.filter(u => {
            if (userRoleFilter === 'admin' && u.role !== 'admin' && !u.isMaster) return false;
            if (userRoleFilter === 'user' && (u.role === 'admin' || u.isMaster)) return false;
            if (userRoleFilter === 'deletions' && !u.deletionRequested) return false;
            if (userSearch.trim()) {
                const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
                const q = norm(userSearch);
                const matchName = norm(u.fullName).includes(q);
                const matchEmail = norm(u.email).includes(q);
                return matchName || matchEmail;
            }
            return true;
        });
    }, [users, userRoleFilter, userSearch]);

    return (
        <div className="space-y-4 animate-fade-in">
            {/* Server Communication Error Banner */}
            {apiError && (
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-600 dark:text-rose-400 font-semibold animate-fade-in">
                    <div className="flex items-center gap-2.5">
                        <AlertTriangle size={18} className="shrink-0 text-rose-500" />
                        <span>Erro ao carregar dados do servidor: <strong>{apiError}</strong></span>
                    </div>
                    <button
                        onClick={() => {
                            setApiError(null);
                            loadStats();
                            if (activeTab === 'users') loadUsers();
                            if (activeTab === 'logs') loadLogs();
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold cursor-pointer shrink-0 transition-colors flex items-center justify-center gap-1.5 shadow-sm"
                    >
                        <RefreshCw size={13} />
                        <span>Tentar Novamente</span>
                    </button>
                </div>
            )}

            {/* Tabs Navigation (2x2 Grid on Mobile, 4x1 on Desktop - 0 scroll, 100% visible) */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5 sm:gap-2 p-1 rounded-2xl bg-slate-200/60 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
                <button
                    onClick={() => {
                        setActiveTab('stats');
                        loadStats();
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'stats'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
                    }`}
                >
                    <LayoutDashboard size={15} />
                    <span>Painel</span>
                </button>

                <button
                    onClick={() => {
                        setActiveTab('users');
                        loadUsers();
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'users'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
                    }`}
                >
                    <Users size={15} />
                    <span>Utilizadores ({users.length})</span>
                    {pendingDeletionsCount > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse">
                            {pendingDeletionsCount}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => {
                        setActiveTab('logs');
                        loadLogs();
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'logs'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
                    }`}
                >
                    <FileText size={15} />
                    <span>Logs</span>
                    {stats?.logs?.errors > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                            {stats.logs.errors}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('operations')}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'operations'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-white/60 dark:hover:bg-slate-800'
                    }`}
                >
                    <Database size={15} />
                    <span>Operações</span>
                </button>
            </div>

            {/* TAB 0: ESTATÍSTICAS / VISÃO GERAL */}
            {activeTab === 'stats' && (
                <div className="space-y-6 animate-fade-in">
                    {/* Header Controls & Filter */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div>
                            <div className="flex items-center gap-2">
                                <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <TrendingUp size={18} className="text-blue-500" />
                                    <span>Métricas de Tráfego & Audiência</span>
                                </h2>
                                <span className="hidden min-[480px]:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> Em direto
                                </span>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 flex items-center gap-1.5">
                                <Shield size={12} className="text-blue-500 shrink-0" />
                                <span>Tráfego do Administrador excluído automaticamente (dados reais).</span>
                            </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                            {/* Live Toggle Pill */}
                            <button
                                onClick={() => setAutoRefreshStats(!autoRefreshStats)}
                                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer select-none ${
                                    autoRefreshStats
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 shadow-2xs'
                                        : 'bg-slate-100 dark:bg-slate-800/80 text-slate-500 border-slate-200 dark:border-slate-700'
                                }`}
                                title={autoRefreshStats ? "Atualização em direto ativa a cada 15s (pausa se minimizares o separador)" : "Atualização automática desativada. Clica para ligar."}
                            >
                                <span className={`w-2 h-2 rounded-full ${autoRefreshStats ? (isLiveRefreshing ? 'bg-emerald-400 scale-125' : 'bg-emerald-500 animate-pulse') : 'bg-slate-400'}`} />
                                <span className="font-bold">{autoRefreshStats ? 'Em Direto (15s)' : 'Pausado'}</span>
                            </button>

                            {/* Timeframe Selector */}
                            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/60 dark:border-slate-700/60 text-xs font-semibold">
                                {[
                                    { id: '24h', label: '24h' },
                                    { id: '7d', label: '7d' },
                                    { id: '30d', label: '30d' },
                                    { id: 'all', label: 'Tudo' }
                                ].map(tf => (
                                    <button
                                        key={tf.id}
                                        onClick={() => {
                                            setAnalyticsTimeframe(tf.id);
                                            loadStats(tf.id);
                                        }}
                                        className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                                            analyticsTimeframe === tf.id
                                                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-xs font-bold'
                                                : 'text-slate-500 hover:text-slate-900 dark:hover:text-slate-200'
                                        }`}
                                    >
                                        {tf.label}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={() => loadStats(analyticsTimeframe)}
                                disabled={isLoadingStats}
                                className="p-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 transition-all cursor-pointer shrink-0 disabled:opacity-50"
                                title="Atualizar estatísticas agora"
                            >
                                <RefreshCw size={14} className={isLoadingStats || isLiveRefreshing ? 'animate-spin text-blue-500' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* 4 Hero Analytics Cards */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                        {/* Unique Visitors */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-blue-500/40 transition-all">
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Visitantes Únicos</span>
                                <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                    <Globe size={15} />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {isLoadingStats ? '...' : (stats?.analytics?.uniqueVisitors ?? 0)}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                                Dispositivos distintos
                            </div>
                        </div>

                        {/* Page Views */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-emerald-500/40 transition-all">
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Visualizações</span>
                                <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                                    <Eye size={15} />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {isLoadingStats ? '...' : (stats?.analytics?.totalPageViews ?? 0)}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                                Total de páginas vistas
                            </div>
                        </div>

                        {/* Average Session Duration */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-amber-500/40 transition-all">
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Tempo Médio</span>
                                <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                                    <Clock size={15} />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {isLoadingStats ? '...' : (stats?.analytics?.avgDurationFormatted || '0s')}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                                Duração por sessão
                            </div>
                        </div>

                        {/* Interactivity / Events */}
                        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between hover:border-purple-500/40 transition-all">
                            <div className="flex items-center justify-between gap-1.5 mb-1.5">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Interações</span>
                                <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                                    <MousePointerClick size={15} />
                                </div>
                            </div>
                            <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                {isLoadingStats ? '...' : (stats?.analytics?.totalEvents ?? 0)}
                            </div>
                            <div className="text-[11px] text-slate-500 mt-1 pt-1.5 border-t border-slate-100 dark:border-slate-800/80">
                                Provas, buscas e favoritos
                            </div>
                        </div>
                    </div>

                    {/* Geography & Devices Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* 1. Where they are from (Countries & Cities) */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Globe size={16} className="text-blue-500" />
                                    <span>De Onde São (Geolocalização)</span>
                                </h3>
                                <span className="text-xs font-semibold text-slate-500">
                                    {stats?.analytics?.countries?.length || 0} países
                                </span>
                            </div>

                            {/* Top Countries & Cities */}
                            {stats?.analytics?.cities?.length > 0 || stats?.analytics?.countries?.length > 0 ? (
                                <div className="space-y-3">
                                    {/* Cities list with visual bars */}
                                    <div className="space-y-2">
                                        <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Principais Cidades & Regiões</div>
                                        {stats.analytics.cities.slice(0, 5).map((c, idx) => {
                                            const totalVisitors = stats.analytics.totalSessions || 1;
                                            const pct = Math.min(100, Math.round((c.count / totalVisitors) * 100));
                                            return (
                                                <div key={idx} className="space-y-1">
                                                    <div className="flex items-center justify-between text-xs font-medium">
                                                        <span className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
                                                            <span>{getCountryFlag(c.country)}</span>
                                                            <strong className="font-semibold">{c.city}</strong>
                                                            <span className="text-[11px] text-slate-400">({c.country})</span>
                                                        </span>
                                                        <span className="text-slate-500 font-mono text-[11px]">{c.count} ({pct}%)</span>
                                                    </div>
                                                    <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                                        <div 
                                                            className="bg-blue-500 h-full rounded-full transition-all duration-500" 
                                                            style={{ width: `${Math.max(5, pct)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Countries badges */}
                                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
                                        <span className="text-[11px] font-medium text-slate-400 mr-1">Países:</span>
                                        {stats.analytics.countries.slice(0, 6).map((co, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-lg bg-slate-50 dark:bg-slate-800 border border-slate-200/60 dark:border-slate-700/60 text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                                                <span>{getCountryFlag(co.country)}</span>
                                                <span>{co.country}</span>
                                                <span className="font-bold text-slate-400">({co.count})</span>
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ) : (
                                <div className="py-8 text-center text-xs text-slate-400">
                                    <Globe size={24} className="mx-auto mb-2 text-slate-300 dark:text-slate-600" />
                                    A registar primeiros visitantes anónimos...
                                </div>
                            )}
                        </div>

                        {/* 2. Devices & Technology */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Smartphone size={16} className="text-emerald-500" />
                                    <span>Dispositivos & Tecnologia</span>
                                </h3>
                                <span className="text-xs font-semibold text-slate-500">Plataformas</span>
                            </div>

                            {/* Device Breakdown Cards */}
                            {(() => {
                                const devices = stats?.analytics?.devices || [];
                                const total = devices.reduce((sum, d) => sum + d.count, 0) || 1;
                                const mobileCount = devices.find(d => d.device === 'Mobile')?.count || 0;
                                const desktopCount = devices.find(d => d.device === 'Desktop')?.count || 0;
                                const tabletCount = devices.find(d => d.device === 'Tablet')?.count || 0;

                                const mobilePct = Math.round((mobileCount / total) * 100);
                                const desktopPct = Math.round((desktopCount / total) * 100);
                                const tabletPct = Math.round((tabletCount / total) * 100);

                                return (
                                    <div className="space-y-4">
                                        <div className="grid grid-cols-3 gap-2">
                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center text-center">
                                                <Smartphone size={18} className="text-blue-500 mb-1" />
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">Mobile</div>
                                                <div className="text-base font-black text-blue-600 dark:text-blue-400">{mobilePct}%</div>
                                                <div className="text-[10px] text-slate-400">{mobileCount} visitas</div>
                                            </div>

                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center text-center">
                                                <Monitor size={18} className="text-emerald-500 mb-1" />
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">Desktop</div>
                                                <div className="text-base font-black text-emerald-600 dark:text-emerald-400">{desktopPct}%</div>
                                                <div className="text-[10px] text-slate-400">{desktopCount} visitas</div>
                                            </div>

                                            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col items-center justify-center text-center">
                                                <Tablet size={18} className="text-purple-500 mb-1" />
                                                <div className="text-xs font-bold text-slate-900 dark:text-white">Tablet</div>
                                                <div className="text-base font-black text-purple-600 dark:text-purple-400">{tabletPct}%</div>
                                                <div className="text-[10px] text-slate-400">{tabletCount} visitas</div>
                                            </div>
                                        </div>

                                        {/* Top Browsers and OS */}
                                        <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-100 dark:border-slate-800">
                                            <div>
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Navegadores</span>
                                                <div className="space-y-1">
                                                    {(stats?.analytics?.browsers || []).slice(0, 3).map((b, i) => (
                                                        <div key={i} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                                                            <span>{b.browser}</span>
                                                            <span className="font-semibold text-slate-900 dark:text-slate-200">{b.count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <div>
                                                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">Sistemas Operativos</span>
                                                <div className="space-y-1">
                                                    {(stats?.analytics?.os || []).slice(0, 3).map((o, i) => (
                                                        <div key={i} className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                                                            <span>{o.os}</span>
                                                            <span className="font-semibold text-slate-900 dark:text-slate-200">{o.count}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}
                        </div>
                    </div>

                    {/* What they did: Top Events, Searches & Top Pages */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* 1. Most Popular Events Consulted */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Flame size={16} className="text-orange-500" />
                                    <span>Provas Mais Consultadas</span>
                                </h3>
                                <span className="text-xs font-semibold text-slate-500">Cliques</span>
                            </div>

                            {stats?.analytics?.topEvents?.length > 0 ? (
                                <div className="space-y-2">
                                    {stats.analytics.topEvents.slice(0, 5).map((ev, i) => (
                                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                                            <div className="min-w-0 flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[10px] font-bold flex items-center justify-center shrink-0">
                                                    #{i + 1}
                                                </span>
                                                <span className="truncate font-semibold text-slate-800 dark:text-slate-200" title={ev.title}>
                                                    {ev.title}
                                                </span>
                                            </div>
                                            <span className="px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-600 dark:text-orange-400 text-[11px] font-bold shrink-0">
                                                {ev.clicks} {ev.clicks === 1 ? 'clique' : 'cliques'}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 py-6 text-center">Nenhum clique em provas registado.</p>
                            )}
                        </div>

                        {/* 2. Top Searches */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Search size={16} className="text-purple-500" />
                                    <span>Termos Mais Pesquisados</span>
                                </h3>
                                <span className="text-xs font-semibold text-slate-500">Buscas</span>
                            </div>

                            {stats?.analytics?.topSearches?.length > 0 ? (
                                <div className="flex flex-wrap gap-2 pt-1">
                                    {stats.analytics.topSearches.slice(0, 10).map((s, i) => (
                                        <span key={i} className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-2xs">
                                            <Search size={11} className="text-purple-500 shrink-0" />
                                            <span>"{s.query}"</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md bg-purple-500/10 text-purple-600 dark:text-purple-400">
                                                {s.count}
                                            </span>
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 py-6 text-center">Nenhuma pesquisa realizada no período.</p>
                            )}
                        </div>

                        {/* 3. Top Visited Pages */}
                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Compass size={16} className="text-blue-500" />
                                    <span>Páginas Mais Acedidas</span>
                                </h3>
                                <span className="text-xs font-semibold text-slate-500">Views</span>
                            </div>

                            {stats?.analytics?.topPages?.length > 0 ? (
                                <div className="space-y-2">
                                    {stats.analytics.topPages.slice(0, 5).map((p, i) => (
                                        <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                                            <span className="font-mono text-[11px] text-slate-700 dark:text-slate-300 truncate">
                                                {p.path === '/' ? '/ (Geral)' : p.path}
                                            </span>
                                            <span className="font-bold text-slate-900 dark:text-white shrink-0">
                                                {p.views} views
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-xs text-slate-400 py-6 text-center">A aguardar dados de navegação.</p>
                            )}
                        </div>
                    </div>

                    {/* Live Recent Sessions Feed */}
                    {stats?.analytics?.recentSessions?.length > 0 && (
                        <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                            <div className="flex items-center justify-between">
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                    <Radio size={16} className="text-rose-500 animate-pulse" />
                                    <span>Últimas Visitas em Tempo Real</span>
                                </h3>
                                <span className="text-xs text-slate-500 font-medium">Sessões recentes anónimas</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {stats.analytics.recentSessions.slice(0, 6).map((s) => (
                                    <div key={s.id} className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between gap-2 text-xs">
                                        <div className="flex items-center justify-between">
                                            <span className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                                                <span>{getCountryFlag(s.country)}</span>
                                                <span className="truncate">{s.city !== 'Desconhecido' ? s.city : s.country}</span>
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-medium">{formatTimeAgo(s.lastActiveAt)}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                                            <span className="flex items-center gap-1">
                                                {s.device === 'Mobile' ? <Smartphone size={12} /> : <Monitor size={12} />}
                                                <span>{s.browser} • {s.os}</span>
                                            </span>
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                {s.pageViewsCount} {s.pageViewsCount === 1 ? 'view' : 'views'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Section 4: System & Database Health Metrics */}
                    <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-4">
                        <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                            <Database size={14} className="text-slate-400" />
                            <span>Estado da Base de Dados & Sistema</span>
                        </div>

                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                            <div 
                                onClick={() => {
                                    setActiveTab('users');
                                    loadUsers();
                                }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer hover:border-blue-500/50 transition-all group"
                            >
                                <div className="flex items-center justify-between gap-1.5 mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Utilizadores</span>
                                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Users size={16} />
                                    </div>
                                </div>
                                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                    {isLoadingStats ? '...' : (stats?.users?.total ?? users.length)}
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                                    <span>Contas registadas</span>
                                    <span className="text-blue-500 font-bold group-hover:translate-x-0.5 transition-transform">Gerir →</span>
                                </div>
                            </div>

                            <div 
                                onClick={() => setActiveTab('operations')}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer hover:border-emerald-500/50 transition-all group"
                            >
                                <div className="flex items-center justify-between gap-1.5 mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eventos no BD</span>
                                    <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Database size={16} />
                                    </div>
                                </div>
                                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                    {isLoadingStats ? '...' : (stats?.events?.total ?? 0)}
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                                    <span>{stats?.events ? `${stats.events.fpc} FPC • ${stats.events.cabreira} Cabr.` : 'A carregar...'}</span>
                                    <span className="text-emerald-500 font-bold group-hover:translate-x-0.5 transition-transform">Scrapers →</span>
                                </div>
                            </div>

                            <div 
                                onClick={() => {
                                    setLogLevelFilter('ERROR');
                                    setActiveTab('logs');
                                    loadLogs();
                                }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer hover:border-rose-500/50 transition-all group"
                            >
                                <div className="flex items-center justify-between gap-1.5 mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Erros</span>
                                    <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <AlertTriangle size={16} />
                                    </div>
                                </div>
                                <div className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-400">
                                    {isLoadingStats ? '...' : (stats?.logs?.errors ?? 0)}
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                                    <span>Nível ERROR</span>
                                    <span className="text-rose-500 font-bold group-hover:translate-x-0.5 transition-transform">Ver Logs →</span>
                                </div>
                            </div>

                            <div 
                                onClick={() => {
                                    setActiveTab('logs');
                                    loadLogs();
                                }}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm flex flex-col justify-between cursor-pointer hover:border-purple-500/50 transition-all group"
                            >
                                <div className="flex items-center justify-between gap-1.5 mb-2">
                                    <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Logs</span>
                                    <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Activity size={16} />
                                    </div>
                                </div>
                                <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
                                    {isLoadingStats ? '...' : (stats?.logs?.total ?? 0)}
                                </div>
                                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500">
                                    <span>Histórico auditado</span>
                                    <span className="text-purple-500 font-bold group-hover:translate-x-0.5 transition-transform">Abrir →</span>
                                </div>
                            </div>
                        </div>

                        {/* Event Details and Scraper Breakdown */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Calendar size={16} className="text-blue-500" />
                                        <span>Distribuição de Eventos</span>
                                    </h3>
                                    <span className="text-xs font-semibold text-slate-500">{stats?.events?.total || 0} no total</span>
                                </div>
                                <div className="grid grid-cols-2 gap-2 text-xs">
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                        <div className="text-slate-500 text-[11px]">Federação (FPC)</div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white">{stats?.events?.fpc || 0}</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                        <div className="text-slate-500 text-[11px]">Cabreira Solutions</div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white">{stats?.events?.cabreira || 0}</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                        <div className="text-slate-500 text-[11px]">Com Prazo Inscrição</div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white">{stats?.events?.withRegistration || 0}</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60">
                                        <div className="text-slate-500 text-[11px]">Com Preços / Info</div>
                                        <div className="text-lg font-bold text-slate-900 dark:text-white">{stats?.events?.withPrices || 0}</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                        <Activity size={16} className="text-purple-500" />
                                        <span>Última Atividade do Sistema</span>
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setActiveTab('logs');
                                            loadLogs();
                                        }}
                                        className="text-xs font-bold text-purple-500 hover:underline cursor-pointer"
                                    >
                                        Ver todos
                                    </button>
                                </div>
                                {stats?.logs?.recent?.length > 0 ? (
                                    <div className="space-y-2">
                                        {stats.logs.recent.slice(0, 4).map(l => (
                                            <div key={l.id} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/60 dark:border-slate-700/60 flex items-center justify-between gap-2 text-xs">
                                                <div className="min-w-0 flex items-center gap-2">
                                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-black shrink-0 ${
                                                        l.level === 'ERROR' ? 'bg-rose-500 text-white' :
                                                        l.level === 'WARN' ? 'bg-amber-500 text-white' :
                                                        'bg-blue-500 text-white'
                                                    }`}>
                                                        {l.level}
                                                    </span>
                                                    <span className="truncate font-medium text-slate-700 dark:text-slate-300">{l.message}</span>
                                                </div>
                                                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                                                    {new Date(l.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-slate-500 py-4 text-center">Nenhum registo recente.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* TAB 1: UTILIZADORES */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    {/* Deletion Requests Alert Banner */}
                    {pendingDeletionsCount > 0 && (
                        <div className="p-3 sm:p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-rose-700 dark:text-rose-300 animate-fade-in shadow-sm">
                            <div className="flex items-center gap-2">
                                <AlertTriangle size={16} className="shrink-0 text-rose-600 dark:text-rose-400" />
                                <span>
                                    <strong>Atenção:</strong> <strong>{pendingDeletionsCount}</strong> pedido(s) pendente(s) de RGPD.
                                </span>
                            </div>
                            <button 
                                onClick={() => setUserRoleFilter(userRoleFilter === 'deletions' ? 'ALL' : 'deletions')}
                                className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition-colors cursor-pointer shrink-0 w-full sm:w-auto text-center"
                            >
                                {userRoleFilter === 'deletions' ? 'Mostrar Todos' : 'Ver Pedidos Pendentes'}
                            </button>
                        </div>
                    )}

                    {/* Filter Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-white dark:bg-slate-900 p-2.5 sm:p-3 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="relative flex-1">
                            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Pesquisar por nome ou email..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                className="w-full pl-8 sm:pl-9 pr-3 py-1.5 sm:py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 overflow-x-auto no-scrollbar flex-nowrap py-0.5">
                            {[
                                { key: 'ALL', label: 'Todos' },
                                { key: 'admin', label: '🛡️ Admins' },
                                { key: 'user', label: '👤 Users' },
                                ...(pendingDeletionsCount > 0 ? [{ key: 'deletions', label: `🚨 Pedidos (${pendingDeletionsCount})` }] : [])
                            ].map(filter => (
                                <button
                                    key={filter.key}
                                    onClick={() => setUserRoleFilter(filter.key)}
                                    className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                                        userRoleFilter === filter.key
                                            ? filter.key === 'deletions'
                                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 font-bold'
                                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30 font-bold'
                                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                            <button
                                onClick={loadUsers}
                                disabled={isLoadingUsers}
                                className="p-1.5 sm:p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
                                title="Atualizar lista de utilizadores"
                            >
                                <RefreshCw size={14} className={isLoadingUsers ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Users Container */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        {isLoadingUsers && users.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                                <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                                <span>A carregar utilizadores do Clerk...</span>
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="py-12 text-center text-slate-400">
                                Nenhum utilizador encontrado com os filtros selecionados.
                            </div>
                        ) : (
                            <>
                                {/* Mobile View: Cards */}
                                <div className="md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                                    {filteredUsers.map(u => {
                                        const isMaster = u.isMaster;
                                        const isAdmin = u.role === 'admin' || isMaster;
                                        const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-PT') : '—';

                                        return (
                                            <div key={u.id} className={`p-3.5 space-y-3 ${u.deletionRequested ? 'bg-rose-500/[0.05]' : ''}`}>
                                                <div className="flex items-start justify-between gap-2">
                                                    <div className="flex items-center gap-2.5 min-w-0">
                                                        {u.imageUrl ? (
                                                            <img src={u.imageUrl} alt={u.fullName} className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                                                        ) : (
                                                            <div className="w-9 h-9 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                {u.firstName?.[0] || u.email?.[0] || 'U'}
                                                            </div>
                                                        )}
                                                        <div className="min-w-0">
                                                            <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                                                                {u.fullName || 'Sem nome'}
                                                            </div>
                                                            <div className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
                                                                {u.email}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    
                                                    {/* Role badge */}
                                                    <div className="shrink-0">
                                                        {isMaster ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                                👑 Master
                                                            </span>
                                                        ) : isAdmin ? (
                                                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                                                🛡️ Admin
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                👤 User
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Deletion Request Alert Box on Mobile */}
                                                {u.deletionRequested && (
                                                    <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 space-y-2">
                                                        <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                                                            <AlertTriangle size={14} className="shrink-0" />
                                                            <span>{u.deletionType === 'DELETE_DATA' ? 'Pedido: Limpar Dados & Favoritos' : 'Pedido: Eliminar Conta Definitiva'}</span>
                                                        </div>
                                                        {u.deletionReason && (
                                                            <p className="text-[11px] text-slate-600 dark:text-slate-300 italic bg-white/70 dark:bg-slate-900/70 p-2 rounded-lg border border-rose-500/20">
                                                                "{u.deletionReason}"
                                                            </p>
                                                        )}
                                                        <button
                                                            onClick={() => setDeleteTarget({ 
                                                                user: u, 
                                                                mode: u.deletionType === 'DELETE_DATA' ? 'delete_data' : 'delete_account' 
                                                            })}
                                                            className={`w-full py-2 px-3 rounded-xl font-bold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                                                                u.deletionType === 'DELETE_DATA'
                                                                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                                                                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20'
                                                            }`}
                                                        >
                                                            {u.deletionType === 'DELETE_DATA' ? <RotateCcw size={13} /> : <Trash2 size={13} />}
                                                            <span>{u.deletionType === 'DELETE_DATA' ? 'Aceitar & Limpar Dados' : 'Aceitar & Eliminar Conta'}</span>
                                                        </button>
                                                    </div>
                                                )}

                                                {/* Mobile Card Footer & Actions */}
                                                {!isMaster && (
                                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                                                        <span className="text-[10px] text-slate-400">
                                                            Adesão: {joinDate}
                                                        </span>
                                                        <div className="flex items-center gap-1.5">
                                                            {isAdmin ? (
                                                                <button
                                                                    onClick={() => setRoleChangeTarget({ user: u, newRole: 'user' })}
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 transition-colors"
                                                                >
                                                                    Despromover
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    onClick={() => setRoleChangeTarget({ user: u, newRole: 'admin' })}
                                                                    className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/30 hover:bg-blue-500/20 transition-colors"
                                                                >
                                                                    Tornar Admin
                                                                </button>
                                                            )}

                                                            {!u.deletionRequested && (
                                                                <>
                                                                    <button
                                                                        onClick={() => setDeleteTarget({ user: u, mode: 'delete_data' })}
                                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                                                        title="Limpar dados"
                                                                    >
                                                                        <RotateCcw size={14} />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => setDeleteTarget({ user: u, mode: 'delete_account' })}
                                                                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                                                                        title="Eliminar conta"
                                                                    >
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>

                                {/* Desktop View: Table */}
                                <div className="hidden md:block overflow-x-auto">
                                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                        <thead>
                                            <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                                                <th className="py-3 px-4">Utilizador</th>
                                                <th className="py-3 px-4">Email</th>
                                                <th className="py-3 px-4">Cargo / Role</th>
                                                <th className="py-3 px-4">Adesão</th>
                                                <th className="py-3 px-4">Último Acesso</th>
                                                <th className="py-3 px-4 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                            {filteredUsers.map(u => {
                                                const isMaster = u.isMaster;
                                                const isAdmin = u.role === 'admin' || isMaster;
                                                const joinDate = u.createdAt ? new Date(u.createdAt).toLocaleDateString('pt-PT') : '—';
                                                const lastAccess = u.lastSignInAt ? new Date(u.lastSignInAt).toLocaleDateString('pt-PT') : '—';

                                                return (
                                                    <tr key={u.id} className={`transition-colors ${u.deletionRequested ? 'bg-rose-500/[0.04] hover:bg-rose-500/[0.08]' : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/40'}`}>
                                                        <td className="py-3 px-4">
                                                            <div className="flex items-center gap-3">
                                                                {u.imageUrl ? (
                                                                    <img src={u.imageUrl} alt={u.fullName} className="w-8 h-8 rounded-full object-cover border border-slate-200 dark:border-slate-700 shrink-0" />
                                                                ) : (
                                                                    <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                                                                        {u.firstName?.[0] || u.email?.[0] || 'U'}
                                                                    </div>
                                                                )}
                                                                <div className="min-w-0">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                                                                            {u.fullName}
                                                                        </span>
                                                                    </div>
                                                                    {u.deletionRequested && (
                                                                        <div className="mt-1 flex flex-col gap-0.5">
                                                                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-black w-fit shadow-sm ${
                                                                                u.deletionType === 'DELETE_DATA' ? 'bg-amber-500 text-slate-950' : 'bg-rose-500 text-white'
                                                                            }`}>
                                                                                {u.deletionType === 'DELETE_DATA' ? '🧹 Pedido: Eliminar Dados' : '🗑️ Pedido: Eliminar Conta'}
                                                                            </span>
                                                                            {u.deletionReason && (
                                                                                <span className="text-[10px] text-slate-500 italic max-w-xs truncate" title={u.deletionReason}>
                                                                                    "{u.deletionReason}"
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                    <span className="text-[10px] text-slate-400 block font-mono truncate">
                                                                        {u.id}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td className="py-3 px-4 font-mono text-xs text-slate-600 dark:text-slate-300">
                                                            {u.email}
                                                        </td>

                                                        <td className="py-3 px-4">
                                                            {isMaster ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                                                    👑 Master Admin
                                                                </span>
                                                            ) : isAdmin ? (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
                                                                    🛡️ Admin
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
                                                                    👤 Utilizador
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td className="py-3 px-4 text-xs text-slate-500">
                                                            {joinDate}
                                                        </td>

                                                        <td className="py-3 px-4 text-xs text-slate-500">
                                                            {lastAccess}
                                                        </td>

                                                        <td className="py-3 px-4 text-right">
                                                            <div className="flex items-center justify-end gap-1.5">
                                                                {isMaster ? (
                                                                    <span className="text-[11px] text-slate-400 italic">Inalterável</span>
                                                                ) : (
                                                                    <>
                                                                        {/* Botão de Ação Direta para Pedidos Pendentes */}
                                                                        {u.deletionRequested && (
                                                                            <button
                                                                                onClick={() => setDeleteTarget({ 
                                                                                    user: u, 
                                                                                    mode: u.deletionType === 'DELETE_DATA' ? 'delete_data' : 'delete_account' 
                                                                                })}
                                                                                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center gap-1.5 shrink-0 ${
                                                                                    u.deletionType === 'DELETE_DATA'
                                                                                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20'
                                                                                        : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-500/20 animate-pulse'
                                                                                }`}
                                                                                title={`Aceitar e executar pedido de ${u.deletionType === 'DELETE_DATA' ? 'eliminação de dados' : 'eliminação de conta'}`}
                                                                            >
                                                                                {u.deletionType === 'DELETE_DATA' ? <RotateCcw size={13} /> : <Trash2 size={13} />}
                                                                                <span>{u.deletionType === 'DELETE_DATA' ? 'Aceitar & Limpar Dados' : 'Aceitar & Eliminar Conta'}</span>
                                                                            </button>
                                                                        )}

                                                                        {isAdmin ? (
                                                                            <button
                                                                                onClick={() => setRoleChangeTarget({ user: u, newRole: 'user' })}
                                                                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors cursor-pointer"
                                                                                title="Remover privilégios de Administrador"
                                                                            >
                                                                                Despromover
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={() => setRoleChangeTarget({ user: u, newRole: 'admin' })}
                                                                                className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30 transition-colors cursor-pointer"
                                                                                title="Tornar este utilizador Administrador"
                                                                            >
                                                                                Tornar Admin
                                                                            </button>
                                                                        )}

                                                                        {!u.deletionRequested && (
                                                                            <>
                                                                                <button
                                                                                    onClick={() => setDeleteTarget({ user: u, mode: 'delete_data' })}
                                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 transition-colors cursor-pointer"
                                                                                    title="Limpar favoritos e preferências do utilizador"
                                                                                >
                                                                                    <RotateCcw size={14} />
                                                                                </button>
                                                                                <button
                                                                                    onClick={() => setDeleteTarget({ user: u, mode: 'delete_account' })}
                                                                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors cursor-pointer"
                                                                                    title="Eliminar conta permanentemente"
                                                                                >
                                                                                    <Trash2 size={14} />
                                                                                </button>
                                                                            </>
                                                                        )}
                                                                    </>
                                                                )}
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </div>
                    
                    {roleChangeTarget && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                                        roleChangeTarget.newRole === 'admin' 
                                            ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400' 
                                            : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
                                    }`}>
                                        <Shield size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                            {roleChangeTarget.newRole === 'admin' ? 'Promover a Administrador' : 'Despromover Utilizador'}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            Confirmação de alteração de permissões
                                        </p>
                                    </div>
                                </div>

                                <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                                    Tens a certeza que queres alterar o cargo de <strong>{roleChangeTarget.user.fullName}</strong> ({roleChangeTarget.user.email}) para <span className="font-bold uppercase text-blue-500">{roleChangeTarget.newRole}</span>?
                                </p>

                                {roleActionMsg && (
                                    <div className={`p-3 rounded-xl text-xs font-semibold ${
                                        roleActionMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                                    }`}>
                                        {roleActionMsg.text}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2.5 pt-2">
                                    <button
                                        onClick={() => { setRoleChangeTarget(null); setRoleActionMsg(null); }}
                                        disabled={isUpdatingRole}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleUpdateRole}
                                        disabled={isUpdatingRole}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                                            roleChangeTarget.newRole === 'admin'
                                                ? 'bg-blue-600 hover:bg-blue-500'
                                                : 'bg-rose-600 hover:bg-rose-500'
                                        }`}
                                    >
                                        {isUpdatingRole && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                        <span>Confirmar Alteração</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Delete Target Modal (Delete Data vs Delete Permanent Account) */}
                    {deleteTarget && (
                        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
                            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                        {deleteTarget.mode === 'delete_data' ? <RotateCcw size={20} /> : <Trash2 size={20} />}
                                    </div>
                                    <div>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                            {deleteTarget.mode === 'delete_data' ? 'Limpar Dados do Utilizador' : 'Eliminar Conta Permanentemente'}
                                        </h3>
                                        <p className="text-xs text-slate-500">
                                            {deleteTarget.mode === 'delete_data' ? 'Remoção de favoritos e metadados' : 'Eliminação definitiva do perfil no Clerk'}
                                        </p>
                                    </div>
                                </div>

                                <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-700 dark:text-rose-300 leading-relaxed space-y-1">
                                    <p className="font-bold m-0">Utilizador: {deleteTarget.user.fullName} ({deleteTarget.user.email})</p>
                                    {deleteTarget.user.deletionReason && (
                                        <p className="m-0 italic">Motivo indicado: "{deleteTarget.user.deletionReason}"</p>
                                    )}
                                    <p className="m-0 mt-2">
                                        {deleteTarget.mode === 'delete_data'
                                            ? 'Esta ação vai limpar todos os favoritos e preferências, mantendo a conta ativa.'
                                            : 'ATENÇÃO: A conta será apagada permanentemente do sistema de autenticação e não poderá ser recuperada.'}
                                    </p>
                                </div>

                                {deleteActionMsg && (
                                    <div className={`p-3 rounded-xl text-xs font-semibold ${
                                        deleteActionMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-600 border border-rose-500/30'
                                    }`}>
                                        {deleteActionMsg.text}
                                    </div>
                                )}

                                <div className="flex items-center justify-end gap-2.5 pt-2">
                                    <button
                                        onClick={() => { setDeleteTarget(null); setDeleteActionMsg(null); }}
                                        disabled={isDeletingUser}
                                        className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleExecuteUserDeletion}
                                        disabled={isDeletingUser}
                                        className={`px-4 py-2 rounded-xl text-xs font-bold text-white shadow-md transition-all cursor-pointer flex items-center gap-2 ${
                                            deleteTarget.mode === 'delete_data' ? 'bg-amber-600 hover:bg-amber-500' : 'bg-rose-600 hover:bg-rose-500'
                                        }`}
                                    >
                                        {isDeletingUser && <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                                        <span>{deleteTarget.mode === 'delete_data' ? 'Confirmar Limpeza' : 'Eliminar Permanentemente'}</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* TAB 2: LOGS DO SISTEMA */}
            {activeTab === 'logs' && (
                <div className="space-y-4">
                    {/* Controls & Filter Bar */}
                    <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                            <div className="relative flex-1">
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input 
                                    type="text"
                                    placeholder="Pesquisar nos logs por mensagem, erro ou email..."
                                    value={logSearch}
                                    onChange={(e) => setLogSearch(e.target.value)}
                                    className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                                />
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    onClick={() => setAutoRefreshLogs(!autoRefreshLogs)}
                                    className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                                        autoRefreshLogs 
                                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 animate-pulse' 
                                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700'
                                    }`}
                                    title="Atualizar logs automaticamente a cada 10 segundos"
                                >
                                    <RefreshCw size={13} className={autoRefreshLogs ? 'animate-spin' : ''} />
                                    <span>{autoRefreshLogs ? 'Auto (10s) Ligado' : 'Auto-Refresh'}</span>
                                </button>

                                <button
                                    onClick={loadLogs}
                                    disabled={isLoadingLogs}
                                    className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                    <RefreshCw size={13} className={isLoadingLogs ? 'animate-spin' : ''} />
                                    <span>Atualizar</span>
                                </button>
                            </div>
                        </div>

                        {/* Filter Badges & Clear Options */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                            <div className="flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 font-bold uppercase mr-1">Severidade:</span>
                                {[
                                    { key: 'ALL', label: 'Todos' },
                                    { key: 'ERROR', label: '🔴 Erros' },
                                    { key: 'WARN', label: '🟡 Avisos' },
                                    { key: 'INFO', label: '🔵 Info' }
                                ].map(l => (
                                    <button
                                        key={l.key}
                                        onClick={() => setLogLevelFilter(l.key)}
                                        className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                                            logLevelFilter === l.key
                                                ? 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                        }`}
                                    >
                                        {l.label}
                                    </button>
                                ))}

                                <span className="text-[10px] text-slate-400 font-bold uppercase ml-3 mr-1">Origem:</span>
                                <select
                                    value={logSourceFilter}
                                    onChange={(e) => setLogSourceFilter(e.target.value)}
                                    className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs font-semibold text-slate-700 dark:text-slate-300 focus:outline-none"
                                >
                                    <option value="ALL">Todas as Origens</option>
                                    <option value="SCRAPER">SCRAPER (FPC / Cabreira / StopAndGo)</option>
                                    <option value="CRON">CRON (Tarefas Agendadas 03:00)</option>
                                    <option value="SYSTEM">SYSTEM (Sistema & Base de Dados)</option>
                                    <option value="API">API (Endpoints & Meteorologia)</option>
                                </select>
                            </div>

                            <div className="flex items-center gap-1.5">
                                <button
                                    onClick={() => handleClearLogs(false)}
                                    disabled={isClearingLogs}
                                    className="px-2.5 py-1 rounded-lg text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-[11px] font-semibold flex items-center gap-1"
                                    title="Limpar logs com mais de 30 dias"
                                >
                                    <Trash2 size={12} />
                                    <span>Limpar &gt; 30d</span>
                                </button>
                                <button
                                    onClick={() => handleClearLogs(true)}
                                    disabled={isClearingLogs}
                                    className="px-2.5 py-1 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer text-[11px] font-semibold"
                                    title="Limpar todo o histórico de logs"
                                >
                                    Limpar Tudo
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Logs Feed */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        {isLoadingLogs && logs.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                                <span>A carregar registo de logs...</span>
                            </div>
                        ) : logs.length === 0 ? (
                            <div className="py-16 text-center text-slate-400">
                                <CheckCircle2 size={32} className="mx-auto mb-2 text-emerald-500/60" />
                                <p className="text-sm font-semibold">Nenhum log encontrado para os critérios selecionados.</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-100 dark:divide-slate-800/60 font-mono text-xs">
                                {logs.map(log => {
                                    const isError = log.level === 'ERROR';
                                    const isWarn = log.level === 'WARN';
                                    const isExpanded = expandedLogId === log.id;
                                    const isCopied = copiedLogId === log.id;
                                    const timeStr = new Date(log.createdAt).toLocaleString('pt-PT');

                                    return (
                                        <div 
                                            key={log.id} 
                                            className={`p-3 transition-colors ${
                                                isError ? 'bg-rose-500/[0.04] hover:bg-rose-500/[0.08]' : isWarn ? 'bg-amber-500/[0.04] hover:bg-amber-500/[0.08]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                            }`}
                                        >
                                            <div 
                                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                className="cursor-pointer select-none space-y-1.5"
                                            >
                                                {/* Top Row: Badges, User info, and Timestamp */}
                                                <div className="flex items-center justify-between gap-2">
                                                    <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
                                                        <span className="text-slate-400 shrink-0">
                                                            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                        </span>

                                                        {/* Level Badge */}
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-black shrink-0 ${
                                                            isError 
                                                                ? 'bg-rose-500 text-white shadow-sm' 
                                                                : isWarn 
                                                                ? 'bg-amber-500 text-slate-950 font-black shadow-sm' 
                                                                : 'bg-blue-600 text-white shadow-sm'
                                                        }`}>
                                                            {log.level}
                                                        </span>

                                                        {/* Source Badge */}
                                                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0 border border-slate-200/50 dark:border-slate-700/50">
                                                            {log.source}
                                                        </span>
                                                    </div>

                                                    {/* Timestamp on right */}
                                                    <span className="text-[11px] text-slate-400 shrink-0 font-mono font-medium whitespace-nowrap">
                                                        {timeStr}
                                                    </span>
                                                </div>

                                                {/* Bottom Row: Full Width Message (Never overlaps!) */}
                                                <div className="pl-5 text-slate-800 dark:text-slate-200 text-xs font-sans font-medium break-words leading-relaxed">
                                                    {log.message}
                                                </div>
                                            </div>

                                            {/* Expandable Details Box */}
                                            {isExpanded && (
                                                <div className="mt-3 pl-6 pr-2 pt-2 border-t border-slate-200 dark:border-slate-800/80 animate-fade-in">
                                                    <div className="flex items-center justify-between gap-2 mb-1.5">
                                                        <span className="text-[11px] font-semibold text-slate-400">
                                                            Detalhes do Evento & Payload:
                                                        </span>
                                                        <button
                                                            onClick={(e) => { e.stopPropagation(); handleCopyLog(log); }}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-white text-[10px] font-semibold transition-colors cursor-pointer"
                                                        >
                                                            {isCopied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                                            <span>{isCopied ? 'Copiado!' : 'Copiar Log'}</span>
                                                        </button>
                                                    </div>

                                                    <pre className="p-3 rounded-xl bg-slate-950 text-slate-200 text-xs font-mono overflow-x-auto whitespace-pre-wrap max-h-72 scrollbar-thin scrollbar-thumb-slate-700">
                                                        {log.details || 'Sem detalhes adicionais.'}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* TAB 3: OPERAÇÕES & SCRAPERS */}
            {activeTab === 'operations' && (
                <div className="space-y-6">
                    {/* Event Inventory by Platform / Source Grid */}
                    <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                                    Inventário de Provas por Plataforma / Origem
                                </h4>
                            </div>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                Total: {stats?.events?.total || 0} Provas
                            </span>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                            {/* FPC */}
                            <div className="p-3.5 rounded-xl bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 flex items-center gap-3 transition-all hover:border-blue-500/40">
                                <div className="w-10 h-10 rounded-lg bg-blue-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                    FPC
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 truncate">FPCiclismo</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                        {stats?.events?.fpc || 0} <span className="text-[10px] font-normal text-slate-400">provas</span>
                                    </p>
                                </div>
                            </div>

                            {/* Cabreira */}
                            <div className="p-3.5 rounded-xl bg-amber-500/5 dark:bg-amber-500/10 border border-amber-500/20 flex items-center gap-3 transition-all hover:border-amber-500/40">
                                <div className="w-10 h-10 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                    CAB
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-amber-600 dark:text-amber-400 truncate">Cabreira Solutions</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                        {stats?.events?.cabreira || 0} <span className="text-[10px] font-normal text-slate-400">provas</span>
                                    </p>
                                </div>
                            </div>

                            {/* Stop and Go */}
                            <div className="p-3.5 rounded-xl bg-cyan-500/5 dark:bg-cyan-500/10 border border-cyan-500/20 flex items-center gap-3 transition-all hover:border-cyan-500/40">
                                <div className="w-10 h-10 rounded-lg bg-cyan-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                    S&G
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-cyan-600 dark:text-cyan-400 truncate">Stop and Go</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                        {stats?.events?.stopAndGo || 0} <span className="text-[10px] font-normal text-slate-400">provas</span>
                                    </p>
                                </div>
                            </div>

                            {/* Multi-Fonte / Fundidas */}
                            <div className="p-3.5 rounded-xl bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3 transition-all hover:border-emerald-500/40">
                                <div className="w-10 h-10 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-xs shrink-0 shadow-sm">
                                    ✨
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 truncate">Multi-Fonte</p>
                                    <p className="text-lg font-black text-slate-900 dark:text-white leading-tight">
                                        {stats?.events?.multiSource || 0} <span className="text-[10px] font-normal text-slate-400">fundidas</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Extra Quality Badges */}
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400 flex-wrap">
                            <span className="font-semibold text-slate-400">Enriquecimento de Dados:</span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                                📋 {stats?.events?.withProgramme || 0} Programas/Regulamentos
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                                🖼️ {stats?.events?.withImage || 0} Cartazes HD
                            </span>
                            <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 font-medium">
                                🎟️ {stats?.events?.withRegistration || 0} Prazos Inscrição
                            </span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Operation 1: Sincronização & Scraping Completo Universal */}
                        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border-2 border-blue-500/30 dark:border-blue-500/20 shadow-sm space-y-4 col-span-full">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        <h3 className="text-base font-bold text-slate-900 dark:text-white">
                                            Sincronização & Scraping Completo (Universal)
                                        </h3>
                                    </div>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1 max-w-2xl">
                                        Executa o pipeline completo: recolhe FPCiclismo + Cabreira Solutions, extrai programas e anexos (Deep Scraping), e aplica automaticamente a <strong>fusão e complementação inteligente</strong> de provas multi-fonte.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="px-3 py-1 rounded-lg text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                        {stats?.events?.total || 0} Provas na BD
                                    </span>
                                </div>
                            </div>

                            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                                <button
                                    onClick={() => handleRunOperation('unified_scrape', '/api/force-scrape', 'Sincronização & Scraping Completo')}
                                    disabled={runningOp !== null}
                                    className={`w-full sm:w-auto py-3 px-6 rounded-xl font-bold text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2.5 text-white ${
                                        opOutput?.status === 'interrupted'
                                            ? 'bg-amber-600 hover:bg-amber-500 shadow-amber-500/20'
                                            : 'bg-blue-600 hover:bg-blue-500 disabled:opacity-50'
                                    }`}
                                >
                                    {runningOp === 'unified_scrape' ? (
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                    ) : opOutput?.status === 'interrupted' ? (
                                        <RotateCcw size={16} />
                                    ) : (
                                        <Play size={16} />
                                    )}
                                    <span>
                                        {runningOp === 'unified_scrape' 
                                            ? 'A Sincronizar Tudo & Fundir Provas...' 
                                            : opOutput?.status === 'interrupted'
                                            ? 'Retomar Scraping (Continuar onde ficou)'
                                            : 'Executar Scraping Completo'}
                                    </span>
                                </button>

                                <span className="text-xs text-slate-400 text-center sm:text-left">
                                    🕒 Executado automaticamente pela Vercel todos os dias às 03:00.
                                </span>
                            </div>
                        </div>

                        {/* Operation 4: Maintenance Logs */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Manutenção de Logs (&gt; 30 dias)
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                    Liberta espaço no PostgreSQL eliminando logs antigos com mais de um mês.
                                </p>
                            </div>
                            <button
                                onClick={() => handleClearLogs(false)}
                                disabled={isClearingLogs}
                                className="w-full py-2.5 px-4 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                <Trash2 size={14} />
                                <span>Executar Limpeza de Logs Antigos</span>
                            </button>
                        </div>
                    </div>

                    {/* Live Pipeline Execution Dashboard & Stepper */}
                    {(runningOp || opOutput) && (
                        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-xl animate-fade-in text-slate-200">
                            {/* Header: Title, Live Timer, Status Badge */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
                                <div className="flex items-center gap-2.5">
                                    <div className={`p-2 rounded-lg ${runningOp ? 'bg-blue-500/20 text-blue-400' : opOutput?.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : opOutput?.status === 'interrupted' ? 'bg-amber-500/20 text-amber-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                        <Terminal size={18} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                                            <span>Consola de Execução em Tempo Real</span>
                                            {runningOp && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono animate-pulse">
                                                    ⏱️ {Math.floor(scraperElapsedSecs / 60).toString().padStart(2, '0')}:{(scraperElapsedSecs % 60).toString().padStart(2, '0')}s
                                                </span>
                                            )}
                                        </h4>
                                        <p className="text-xs text-slate-400 m-0">
                                            {runningOp ? 'Pipeline em execução paralela com recolha de dados multi-fonte e fusão automática' : opOutput?.message}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 self-start sm:self-auto">
                                    <span className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
                                        runningOp
                                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                                            : opOutput?.status === 'success'
                                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                            : opOutput?.status === 'interrupted'
                                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                    }`}>
                                        {runningOp ? (
                                            <>
                                                <div className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-ping"></div>
                                                <span>A EXECUTAR</span>
                                            </>
                                        ) : opOutput?.status === 'success' ? (
                                            <>
                                                <CheckCircle2 size={13} />
                                                <span>CONCLUÍDO COM SUCESSO</span>
                                            </>
                                        ) : opOutput?.status === 'interrupted' ? (
                                            <>
                                                <RotateCcw size={13} />
                                                <span>PAUSADO (RETOMAR DISPONÍVEL)</span>
                                            </>
                                        ) : (
                                            <>
                                                <AlertTriangle size={13} />
                                                <span>ERRO NA EXECUÇÃO</span>
                                            </>
                                        )}
                                    </span>
                                </div>
                            </div>

                            {/* 2-Phase Visual Execution Dashboard */}
                            <div className="space-y-3.5 pt-1">
                                {/* Phase 1: Extração Paralela Multi-Fonte (4 Fontes Concorrentes) */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Fase 1: Extração Paralela (Simultâneo)</span>
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-semibold flex items-center gap-1">
                                                <span className={`w-1.5 h-1.5 rounded-full ${runningOp ? 'bg-blue-400 animate-pulse' : 'bg-slate-500'}`}></span>
                                                4 Fontes Concorrentes
                                            </span>
                                        </div>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                                        {[
                                            { 
                                                key: 'fpc', 
                                                label: 'FPCiclismo', 
                                                icon: '🏛️',
                                                desc: 'Calendários FPC 26/27', 
                                                data: scraperSources?.fpc || { status: scraperStepDurations[1] ? 'done' : runningOp ? 'running' : 'idle', duration: scraperStepDurations[1], count: null }
                                            },
                                            { 
                                                key: 'cabreira', 
                                                label: 'Cabreira Solutions', 
                                                icon: '⛰️',
                                                desc: 'Granfondos & Provas', 
                                                data: scraperSources?.cabreira || { status: scraperStepDurations[2] ? 'done' : runningOp ? 'running' : 'idle', duration: scraperStepDurations[2], count: null }
                                            },
                                            { 
                                                key: 'stopandgo', 
                                                label: 'Stop & Go', 
                                                icon: '⏱️',
                                                desc: 'Sitemap BTT & Estrada', 
                                                data: scraperSources?.stopandgo || { status: scraperStepDurations[3] ? 'done' : runningOp ? 'running' : 'idle', duration: scraperStepDurations[3], count: null }
                                            },
                                            { 
                                                key: 'classificacoes', 
                                                label: 'Classificações.net', 
                                                icon: '🏆',
                                                desc: 'Rankings & PDFs', 
                                                data: scraperSources?.classificacoes || { status: scraperStepDurations[4] ? 'done' : runningOp ? 'running' : 'idle', duration: scraperStepDurations[4], count: null }
                                            },
                                        ].map(src => {
                                            const isDone = src.data.status === 'done' || (!runningOp && opOutput?.status === 'success');
                                            const isRunning = runningOp && src.data.status === 'running' && !isDone;
                                            
                                            return (
                                                <div 
                                                    key={src.key}
                                                    className={`p-3 rounded-xl border transition-all ${
                                                        isDone
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-sm shadow-emerald-500/5'
                                                            : isRunning
                                                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-200 ring-1 ring-blue-500/30 shadow-md shadow-blue-500/10'
                                                            : 'bg-slate-900/60 border-slate-800 text-slate-400'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-base select-none shrink-0">{src.icon}</span>
                                                            <span className="text-xs font-bold truncate text-slate-100">{src.label}</span>
                                                        </div>
                                                        {isDone ? (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {src.data.duration && (
                                                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                        {src.data.duration}
                                                                    </span>
                                                                )}
                                                                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                                    <Check size={11} strokeWidth={3} />
                                                                </div>
                                                            </div>
                                                        ) : isRunning ? (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <span className="text-[10px] font-mono font-bold text-blue-300">
                                                                    {scraperElapsedSecs}s
                                                                </span>
                                                                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-600 font-mono">Pendente</span>
                                                        )}
                                                    </div>
                                                    
                                                    <div className="flex items-center justify-between text-[11px] opacity-90 mt-1">
                                                        <span className="text-slate-400 truncate">{src.desc}</span>
                                                        {src.data.count ? (
                                                            <span className="font-semibold text-emerald-400 font-mono text-[10px] shrink-0">
                                                                {src.data.count} provas
                                                            </span>
                                                        ) : isRunning ? (
                                                            <span className="text-blue-400 text-[10px] animate-pulse shrink-0">A varrer...</span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>

                                {/* Phase 2: Processamento e Unificação Global (Sequencial) */}
                                <div className="space-y-2 pt-1">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">Fase 2: Processamento e Fusão Global</span>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                                        {[
                                            {
                                                key: 'deepScrape',
                                                stepNum: 1,
                                                label: 'Deep Scraping FPC',
                                                desc: 'Programas, Regulamentos e Cartazes',
                                                data: scraperSteps?.deepScrape || { status: scraperStepDurations[5] ? 'done' : 'idle', duration: scraperStepDurations[5] }
                                            },
                                            {
                                                key: 'unification',
                                                stepNum: 2,
                                                label: 'Unificação & Fusão',
                                                desc: 'Cruzamento Multi-Fonte e Desduplicação',
                                                data: scraperSteps?.unification || { status: scraperStepDurations[6] ? 'done' : 'idle', duration: scraperStepDurations[6] }
                                            },
                                            {
                                                key: 'translation',
                                                stepNum: 3,
                                                label: 'Tradução Multilíngue',
                                                desc: 'EN / ES / FR Automático',
                                                data: scraperSteps?.translation || { status: (!runningOp && opOutput?.status === 'success') ? 'done' : 'idle', duration: null }
                                            }
                                        ].map(st => {
                                            const isDone = st.data.status === 'done' || (!runningOp && opOutput?.status === 'success');
                                            const isRunning = runningOp && st.data.status === 'running' && !isDone;

                                            return (
                                                <div 
                                                    key={st.key}
                                                    className={`p-3 rounded-xl border transition-all ${
                                                        isDone
                                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 shadow-sm shadow-emerald-500/5'
                                                            : isRunning
                                                            ? 'bg-blue-500/15 border-blue-500/40 text-blue-200 ring-1 ring-blue-500/30 shadow-md shadow-blue-500/10'
                                                            : 'bg-slate-900/60 border-slate-800 text-slate-500'
                                                    }`}
                                                >
                                                    <div className="flex items-center justify-between mb-1.5">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="text-xs font-bold text-slate-100 truncate">{st.stepNum}. {st.label}</span>
                                                        </div>
                                                        {isDone ? (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                {st.data.duration && (
                                                                    <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                                                        {st.data.duration}
                                                                    </span>
                                                                )}
                                                                <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                                                    <Check size={11} strokeWidth={3} />
                                                                </div>
                                                            </div>
                                                        ) : isRunning ? (
                                                            <div className="flex items-center gap-1 shrink-0">
                                                                <span className="text-[10px] font-mono font-bold text-blue-300">A processar</span>
                                                                <div className="w-3.5 h-3.5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"></div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-[10px] text-slate-600 font-mono">Aguardar</span>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center justify-between text-[11px] opacity-80 mt-1">
                                                        <p className="m-0 text-slate-400 truncate">{st.desc}</p>
                                                        {st.data.count ? (
                                                            <span className="font-semibold text-emerald-400 font-mono text-[10px] shrink-0">
                                                                {st.data.count}
                                                            </span>
                                                        ) : null}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>

                            {/* Live Streaming Logs Terminal Feed */}
                            <div className="space-y-1.5 pt-1">
                                <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
                                    <span>Logs em Tempo Real do Servidor:</span>
                                    <span>{liveScraperLogs.length} registos recentes</span>
                                </div>
                                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 font-mono text-xs max-h-56 overflow-y-auto space-y-1.5 scrollbar-thin scrollbar-thumb-slate-700">
                                    {liveScraperLogs.length === 0 ? (
                                        <p className="text-slate-500 text-[11px] italic m-0">A aguardar primeiros registos do pipeline...</p>
                                    ) : (
                                        liveScraperLogs.map((l, idx) => {
                                            const time = new Date(l.createdAt).toLocaleTimeString('pt-PT');
                                            const isErr = l.level === 'ERROR';
                                            const isWarn = l.level === 'WARN';
                                            return (
                                                <div key={l.id || idx} className="flex items-start gap-2 text-[11px] leading-relaxed">
                                                    <span className="text-slate-500 shrink-0 select-none">[{time}]</span>
                                                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                                                        isErr ? 'bg-rose-500/20 text-rose-400' : isWarn ? 'bg-amber-500/20 text-amber-400' : 'bg-blue-500/20 text-blue-400'
                                                    }`}>
                                                        {l.level}
                                                    </span>
                                                    <span className={isErr ? 'text-rose-300' : isWarn ? 'text-amber-300' : 'text-slate-300'}>
                                                        {l.message}
                                                    </span>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            {/* Completion Summary Breakdown (when finished) */}
                            {!runningOp && opOutput?.raw && opOutput?.status === 'success' && (
                                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                                    <div className="flex items-center gap-2.5 text-emerald-400 font-semibold">
                                        <Sparkles size={16} className="shrink-0" />
                                        <span>Pipeline universal concluído com sucesso. Base de dados atualizada!</span>
                                    </div>
                                    <button 
                                        onClick={() => {
                                            setActiveTab('logs');
                                            loadLogs();
                                        }}
                                        className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer"
                                    >
                                        <span>Ver Todos os Logs</span>
                                        <ChevronRight size={13} />
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
