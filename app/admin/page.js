'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { 
    Users, FileText, Activity, Shield, AlertTriangle, CheckCircle2, 
    XCircle, Info, RefreshCw, Search, Trash2, Download, ExternalLink, 
    Clock, Calendar, UserCheck, UserX, Database, Play, Check, ChevronDown, ChevronRight, Copy, RotateCcw
} from 'lucide-react';

export default function AdminDashboardPage() {
    const [activeTab, setActiveTab] = useState('users'); // 'users' | 'logs' | 'operations'
    
    // Stats State
    const [stats, setStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);

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

    // Operations State
    const [runningOp, setRunningOp] = useState(null);
    const [opOutput, setOpOutput] = useState(null);

    // 1. Fetch Stats
    const loadStats = useCallback(async () => {
        setIsLoadingStats(true);
        try {
            const res = await fetch('/api/admin/stats');
            const data = await res.json();
            if (data.success) {
                setStats(data.stats);
            }
        } catch (e) {
            console.error('Error loading stats:', e);
        } finally {
            setIsLoadingStats(false);
        }
    }, []);

    // 2. Fetch Users
    const loadUsers = useCallback(async () => {
        setIsLoadingUsers(true);
        try {
            const res = await fetch('/api/admin/users');
            const data = await res.json();
            if (data.success) {
                setUsers(data.users || []);
                setPendingDeletionsCount(data.pendingDeletionsCount || 0);
            }
        } catch (e) {
            console.error('Error loading users:', e);
        } finally {
            setIsLoadingUsers(false);
        }
    }, []);

    // 3. Fetch Logs
    const loadLogs = useCallback(async () => {
        setIsLoadingLogs(true);
        try {
            const params = new URLSearchParams();
            if (logLevelFilter !== 'ALL') params.set('level', logLevelFilter);
            if (logSourceFilter !== 'ALL') params.set('source', logSourceFilter);
            if (logSearch.trim()) params.set('search', logSearch.trim());
            params.set('limit', '150');

            const res = await fetch(`/api/admin/logs?${params.toString()}`);
            const data = await res.json();
            if (data.success) {
                setLogs(data.logs || []);
            }
        } catch (e) {
            console.error('Error loading logs:', e);
        } finally {
            setIsLoadingLogs(false);
        }
    }, [logLevelFilter, logSourceFilter, logSearch]);

    // Initial load
    useEffect(() => {
        loadStats();
        if (activeTab === 'users') loadUsers();
        if (activeTab === 'logs') loadLogs();
    }, [activeTab, loadStats, loadUsers, loadLogs]);

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
            const res = await fetch(`/api/admin/users/${roleChangeTarget.user.id}/role`, {
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
            const res = await fetch(`/api/admin/logs?${clearAll ? 'all=true' : 'days=30'}`, { method: 'DELETE' });
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

    // Run Scraper / Maintenance Operation
    const handleRunOperation = async (opKey, endpoint, label) => {
        setRunningOp(opKey);
        setOpOutput({ label, status: 'loading', message: `A executar "${label}"...` });
        try {
            const res = await fetch(endpoint);
            const data = await res.json();
            setOpOutput({
                label,
                status: data.success ? 'success' : 'error',
                message: data.message || `Operação concluída com sucesso (${data.count || 0} eventos processados).`,
                raw: data
            });
            await loadStats();
            if (activeTab === 'logs') await loadLogs();
        } catch (e) {
            setOpOutput({
                label,
                status: 'error',
                message: `Erro na execução: ${e.message}`,
                raw: e
            });
        } finally {
            setRunningOp(null);
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
            const res = await fetch(`/api/admin/users/${deleteTarget.user.id}?mode=${deleteTarget.mode}`, {
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
                const q = userSearch.toLowerCase();
                const matchName = u.fullName?.toLowerCase().includes(q);
                const matchEmail = u.email?.toLowerCase().includes(q);
                return matchName || matchEmail;
            }
            return true;
        });
    }, [users, userRoleFilter, userSearch]);

    return (
        <div className="space-y-6 animate-fade-in">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Utilizadores</span>
                        <div className="w-7 h-7 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <Users size={14} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {isLoadingStats ? '...' : (stats?.users?.total ?? users.length)}
                    </div>
                    <span className="text-[11px] text-slate-500">Contas registadas</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Eventos no BD</span>
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                            <Database size={14} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {isLoadingStats ? '...' : (stats?.events?.total ?? 0)}
                    </div>
                    <span className="text-[11px] text-slate-500">
                        {stats?.events ? `${stats.events.fpc} FPC • ${stats.events.cabreira} Cabreira` : 'A carregar...'}
                    </span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Erros Registados</span>
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                            <AlertTriangle size={14} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-rose-600 dark:text-rose-400">
                        {isLoadingStats ? '...' : (stats?.logs?.errors ?? 0)}
                    </div>
                    <span className="text-[11px] text-slate-500">Logs de nível ERROR</span>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total de Logs</span>
                        <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <Activity size={14} />
                        </div>
                    </div>
                    <div className="text-2xl font-black text-slate-900 dark:text-white">
                        {isLoadingStats ? '...' : (stats?.logs?.total ?? 0)}
                    </div>
                    <span className="text-[11px] text-slate-500">Histórico de eventos</span>
                </div>
            </div>

            {/* Tabs Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'users'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                >
                    <Users size={16} />
                    <span>Utilizadores ({users.length})</span>
                </button>

                <button
                    onClick={() => setActiveTab('logs')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'logs'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                >
                    <Activity size={16} />
                    <span>Logs do Sistema</span>
                    {stats?.logs?.errors > 0 && (
                        <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white">
                            {stats.logs.errors}
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab('operations')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                        activeTab === 'operations'
                            ? 'bg-blue-600 text-white shadow-md'
                            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-slate-800'
                    }`}
                >
                    <Database size={16} />
                    <span>Operações & Scrapers</span>
                </button>
            </div>

            {/* TAB 1: UTILIZADORES */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    {/* Deletion Requests Alert Banner */}
                    {pendingDeletionsCount > 0 && (
                        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-rose-700 dark:text-rose-300 animate-fade-in shadow-sm">
                            <div className="flex items-center gap-2.5">
                                <AlertTriangle size={18} className="shrink-0 text-rose-600 dark:text-rose-400" />
                                <span>
                                    <strong>Atenção:</strong> Existem <strong>{pendingDeletionsCount}</strong> utilizador(es) com pedido de eliminação de conta pendente de processamento.
                                </span>
                            </div>
                            <button 
                                onClick={() => setUserRoleFilter(userRoleFilter === 'deletions' ? 'ALL' : 'deletions')}
                                className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow transition-colors cursor-pointer shrink-0"
                            >
                                {userRoleFilter === 'deletions' ? 'Mostrar Todos' : 'Filtrar Pedidos Pendentes'}
                            </button>
                        </div>
                    )}

                    {/* Filter Bar */}
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200 dark:border-slate-800">
                        <div className="relative flex-1">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                                type="text"
                                placeholder="Pesquisar utilizador por nome ou email..."
                                value={userSearch}
                                onChange={(e) => setUserSearch(e.target.value)}
                                className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white focus:outline-none focus:border-blue-500 transition-colors"
                            />
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 overflow-x-auto pb-1 sm:pb-0">
                            {[
                                { key: 'ALL', label: 'Todos' },
                                { key: 'admin', label: '🛡️ Admins' },
                                { key: 'user', label: '👤 Users' },
                                ...(pendingDeletionsCount > 0 ? [{ key: 'deletions', label: `🚨 Pedidos (${pendingDeletionsCount})` }] : [])
                            ].map(filter => (
                                <button
                                    key={filter.key}
                                    onClick={() => setUserRoleFilter(filter.key)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                        userRoleFilter === filter.key
                                            ? filter.key === 'deletions'
                                                ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                                                : 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                            : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                                    }`}
                                >
                                    {filter.label}
                                </button>
                            ))}
                            <button
                                onClick={loadUsers}
                                disabled={isLoadingUsers}
                                className="p-2 rounded-lg text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer ml-1"
                                title="Atualizar lista de utilizadores"
                            >
                                <RefreshCw size={15} className={isLoadingUsers ? 'animate-spin' : ''} />
                            </button>
                        </div>
                    </div>

                    {/* Users Table */}
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs sm:text-sm">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold text-[11px] uppercase tracking-wider">
                                        <th className="py-3 px-4">Utilizador</th>
                                        <th className="py-3 px-4">Email</th>
                                        <th className="py-3 px-4">Cargo / Role</th>
                                        <th className="py-3 px-4 hidden md:table-cell">Adesão</th>
                                        <th className="py-3 px-4 hidden lg:table-cell">Último Acesso</th>
                                        <th className="py-3 px-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                                    {isLoadingUsers && users.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400">
                                                <div className="w-6 h-6 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mx-auto mb-2"></div>
                                                <span>A carregar utilizadores do Clerk...</span>
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-slate-400">
                                                Nenhum utilizador encontrado com os filtros selecionados.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map(u => {
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

                                                    <td className="py-3 px-4 text-xs text-slate-500 hidden md:table-cell">
                                                        {joinDate}
                                                    </td>

                                                    <td className="py-3 px-4 text-xs text-slate-500 hidden lg:table-cell">
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
                                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-500 hover:bg-amber-500/10 border border-slate-200 dark:border-slate-800 hover:border-amber-500/30 transition-colors cursor-pointer"
                                                                                title="Limpar todos os dados e favoritos do utilizador"
                                                                            >
                                                                                <RotateCcw size={14} />
                                                                            </button>

                                                                            <button
                                                                                onClick={() => setDeleteTarget({ user: u, mode: 'delete_account' })}
                                                                                className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-500/10 border border-slate-200 dark:border-slate-800 hover:border-rose-500/30 transition-colors cursor-pointer"
                                                                                title="Eliminar permanentemente a conta do utilizador"
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
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Role Confirmation Modal */}
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
                                    <option value="SCRAPER">SCRAPER (FPC / Cabreira)</option>
                                    <option value="CALENDAR">CALENDAR (Google Sync)</option>
                                    <option value="AUTH">AUTH (Perfis & Permissões)</option>
                                    <option value="API">API (Endpoints)</option>
                                    <option value="CLIENT">CLIENT (Frontend & Navegador)</option>
                                    <option value="CRON">CRON (Tarefas Automáticas)</option>
                                    <option value="SYSTEM">SYSTEM (Geral)</option>
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
                                                isError ? 'bg-rose-500/[0.03] hover:bg-rose-500/[0.07]' : isWarn ? 'bg-amber-500/[0.03] hover:bg-amber-500/[0.07]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                                            }`}
                                        >
                                            <div 
                                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                                className="flex items-start justify-between gap-3 cursor-pointer select-none"
                                            >
                                                <div className="flex items-start gap-2 min-w-0">
                                                    <span className="text-slate-400 shrink-0 mt-0.5">
                                                        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                                                    </span>

                                                    {/* Level Badge */}
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                                                        isError 
                                                            ? 'bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30' 
                                                            : isWarn 
                                                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                                                            : 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30'
                                                    }`}>
                                                        {log.level}
                                                    </span>

                                                    {/* Source Badge */}
                                                    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                                                        {log.source}
                                                    </span>

                                                    {/* Message */}
                                                    <span className="text-slate-800 dark:text-slate-200 font-sans font-medium break-words leading-relaxed">
                                                        {log.message}
                                                    </span>
                                                </div>

                                                <div className="flex items-center gap-2 shrink-0 text-slate-400 text-[11px]">
                                                    {log.userEmail && (
                                                        <span className="hidden sm:inline text-slate-500 truncate max-w-[140px]" title={log.userEmail}>
                                                            👤 {log.userEmail}
                                                        </span>
                                                    )}
                                                    <span className="shrink-0">{timeStr}</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Operation 1: Scrape Cabreira */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Sincronizar Cabreira Solutions
                                    </h3>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                        Executa o scraper semântico para recolher resumo de percursos, programas, preços, seguros e links StopAndGo.
                                    </p>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/15 text-blue-600 dark:text-blue-400">
                                    {stats?.events?.cabreira || 25} Provas
                                </span>
                            </div>
                            <button
                                onClick={() => handleRunOperation('cabreira', '/api/force-cabreira', 'Sincronizar Cabreira Solutions')}
                                disabled={runningOp !== null}
                                className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                {runningOp === 'cabreira' ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Play size={14} />
                                )}
                                <span>{runningOp === 'cabreira' ? 'A Sincronizar Cabreira...' : 'Executar Scrape Cabreira'}</span>
                            </button>
                        </div>

                        {/* Operation 2: Scrape FPC */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                        Sincronizar FPCiclismo
                                    </h3>
                                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                        Recolhe o calendário oficial da Federação Portuguesa de Ciclismo para o ano atual e seguinte.
                                    </p>
                                </div>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                                    {stats?.events?.fpc || 0} Provas
                                </span>
                            </div>
                            <button
                                onClick={() => handleRunOperation('fpc', '/api/force-scrape', 'Sincronizar FPC')}
                                disabled={runningOp !== null}
                                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                {runningOp === 'fpc' ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Play size={14} />
                                )}
                                <span>{runningOp === 'fpc' ? 'A Sincronizar FPC...' : 'Executar Scrape FPC'}</span>
                            </button>
                        </div>

                        {/* Operation 3: Cleanup Duplicates */}
                        <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-3">
                            <div>
                                <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                                    Limpeza de Duplicados & Manutenção
                                </h3>
                                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                                    Verifica a integridade da base de dados e remove duplicados criados por alterações de títulos.
                                </p>
                            </div>
                            <button
                                onClick={() => handleRunOperation('cleanup', '/api/cleanup-duplicates', 'Limpeza de Duplicados')}
                                disabled={runningOp !== null}
                                className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
                            >
                                {runningOp === 'cleanup' ? (
                                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                ) : (
                                    <Activity size={14} />
                                )}
                                <span>{runningOp === 'cleanup' ? 'A Limpar...' : 'Executar Limpeza de Duplicados'}</span>
                            </button>
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

                    {/* Operation Output Console */}
                    {opOutput && (
                        <div className="bg-slate-950 rounded-2xl border border-slate-800 p-4 space-y-2 animate-fade-in">
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-400 flex items-center gap-2">
                                    <Activity size={14} className="text-blue-400" />
                                    <span>Consola de Execução: {opOutput.label}</span>
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                    opOutput.status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : opOutput.status === 'loading' ? 'bg-blue-500/20 text-blue-400 animate-pulse' : 'bg-rose-500/20 text-rose-400'
                                }`}>
                                    {opOutput.status.toUpperCase()}
                                </span>
                            </div>
                            <p className="text-xs font-mono text-slate-200 m-0">
                                {opOutput.message}
                            </p>
                            {opOutput.raw && (
                                <pre className="mt-2 p-2 rounded bg-slate-900 text-[11px] font-mono text-slate-400 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-700">
                                    {JSON.stringify(opOutput.raw, null, 2)}
                                </pre>
                            )}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
