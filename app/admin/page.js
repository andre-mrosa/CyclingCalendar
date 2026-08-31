'use client';

import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useUser, useAuth } from '@clerk/nextjs';
import { useTheme } from 'next-themes';
import AdminDashboardView, { adminTabs as tabs } from './components/AdminDashboardView';
import Overview from './components/Overview';
import Inventory from './components/Inventory';
import Operations from './components/Operations';
import Users from './components/Users';
import Logs from './components/Logs';
import { ConfirmDialog, Notice } from './components/ui';

async function readResponse(response) {
    const text = await response.text();
    try { return JSON.parse(text); }
    catch { return { success: false, error: `Resposta inválida do servidor (${response.status}).` }; }
}

// Accept the persistent contract and the previous flat status response while the backend rolls out.
function lastRunFrom(data) {
    if (data.lastRun) return data.lastRun;
    if (!data.completed && !data.interrupted) return null;
    return {
        startedAt: data.startedAt || data.startTime,
        completedAt: data.completedAt || data.completionTime,
        durationSeconds: data.durationSeconds,
        years: data.years,
        status: data.interrupted ? 'interrupted' : data.status || 'unknown',
        sources: data.sources,
        steps: data.steps,
        metrics: data.metrics,
    };
}

export default function AdminDashboardPage() {
    const { isLoaded, isSignedIn } = useUser();
    const { getToken } = useAuth();
    const { resolvedTheme, setTheme } = useTheme();
    const [mounted, setMounted] = useState(false);
    const [activeTab, setActiveTab] = useState('stats');
    const [errors, setErrors] = useState({});
    const setError = useCallback((key, message) => setErrors(previous => ({ ...previous, [key]: message })), []);

    const authFetch = useCallback(async function authenticatedFetch(url, options = {}, retries = 2) {
        let token = null;
        try { token = await getToken({ skipCache: retries < 2 }); }
        catch { /* The server remains responsible for authenticating every request. */ }
        const response = await fetch(url, {
            cache: 'no-store',
            ...options,
            headers: { Accept: 'application/json', ...options.headers, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        });
        if (response.status === 401 && retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 600));
            return authenticatedFetch(url, options, retries - 1);
        }
        return response;
    }, [getToken]);

    const [stats, setStats] = useState(null);
    const [isLoadingStats, setIsLoadingStats] = useState(true);
    const [isLiveRefreshing, setIsLiveRefreshing] = useState(false);
    const [autoRefreshStats, setAutoRefreshStats] = useState(true);
    const [analyticsTimeframe, setAnalyticsTimeframe] = useState('7d');
    const statsRequest = useRef(0);

    const loadStats = useCallback(async (silent = false) => {
        const requestId = ++statsRequest.current;
        if (silent) setIsLiveRefreshing(true);
        else setIsLoadingStats(true);
        try {
            const response = await authFetch(`/api/admin/stats?timeframe=${analyticsTimeframe}`);
            const data = await readResponse(response);
            if (requestId !== statsRequest.current) return;
            if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível carregar as estatísticas.');
            setStats(data.stats);
            setError('stats', null);
        } catch (error) {
            if (requestId === statsRequest.current) setError('stats', error.message);
        } finally {
            if (requestId === statsRequest.current) { setIsLoadingStats(false); setIsLiveRefreshing(false); }
        }
    }, [authFetch, analyticsTimeframe, setError]);

    const [users, setUsers] = useState([]);
    const [isLoadingUsers, setIsLoadingUsers] = useState(false);
    const [pendingDeletionsCount, setPendingDeletionsCount] = useState(0);
    const [userSearch, setUserSearch] = useState('');
    const [userRoleFilter, setUserRoleFilter] = useState('ALL');
    const [roleChangeTarget, setRoleChangeTarget] = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [actionBusy, setActionBusy] = useState(false);
    const [actionMessage, setActionMessage] = useState(null);

    const loadUsers = useCallback(async () => {
        setIsLoadingUsers(true);
        try {
            const response = await authFetch('/api/admin/users');
            const data = await readResponse(response);
            if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível carregar os utilizadores.');
            setUsers(data.users || []);
            setPendingDeletionsCount(data.pendingDeletionsCount || 0);
            setError('users', null);
        } catch (error) { setError('users', error.message); }
        finally { setIsLoadingUsers(false); }
    }, [authFetch, setError]);

    const filteredUsers = useMemo(() => {
        const normalize = value => String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const query = normalize(userSearch.trim());
        return users.filter(user => {
            const admin = user.role === 'admin' || user.isMaster;
            if (userRoleFilter === 'admin' && !admin) return false;
            if (userRoleFilter === 'user' && admin) return false;
            if (userRoleFilter === 'deletions' && !user.deletionRequested) return false;
            return !query || normalize(user.fullName).includes(query) || normalize(user.email).includes(query);
        });
    }, [users, userRoleFilter, userSearch]);

    const [logs, setLogs] = useState([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);
    const [logLevelFilter, setLogLevelFilter] = useState('ALL');
    const [logSourceFilter, setLogSourceFilter] = useState('ALL');
    const [logSearch, setLogSearch] = useState('');
    const [expandedLogId, setExpandedLogId] = useState(null);
    const [autoRefreshLogs, setAutoRefreshLogs] = useState(false);
    const [copiedLogId, setCopiedLogId] = useState(null);
    const [clearLogsTarget, setClearLogsTarget] = useState(null);
    const logsRequest = useRef(0);

    const loadLogs = useCallback(async () => {
        const requestId = ++logsRequest.current;
        setIsLoadingLogs(true);
        try {
            const params = new URLSearchParams({ limit: '150' });
            if (logLevelFilter !== 'ALL') params.set('level', logLevelFilter);
            if (logSourceFilter !== 'ALL') params.set('source', logSourceFilter);
            if (logSearch.trim()) params.set('search', logSearch.trim());
            const response = await authFetch(`/api/admin/logs?${params}`);
            const data = await readResponse(response);
            if (requestId !== logsRequest.current) return;
            if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível carregar os logs.');
            setLogs(data.logs || []);
            setError('logs', null);
        } catch (error) {
            if (requestId === logsRequest.current) setError('logs', error.message);
        } finally {
            if (requestId === logsRequest.current) setIsLoadingLogs(false);
        }
    }, [authFetch, logLevelFilter, logSourceFilter, logSearch, setError]);

    const [runningOp, setRunningOp] = useState(null);
    const [opOutput, setOpOutput] = useState(null);
    const [scraperState, setScraperState] = useState({});
    const [lastScrapeResult, setLastScrapeResult] = useState(null);
    const [scraperElapsedSecs, setScraperElapsedSecs] = useState(0);
    const [scraperError, setScraperError] = useState(null);
    const triggerPending = useRef(false);
    const triggerFence = useRef(null);
    const statusRequest = useRef(0);
    const wasRunning = useRef(false);
    const reloadStatsRef = useRef(loadStats);
    useEffect(() => { reloadStatsRef.current = loadStats; }, [loadStats]);

    const checkScraperStatus = useCallback(async () => {
        const requestId = ++statusRequest.current;
        try {
            const response = await authFetch('/api/admin/scraper-status');
            const data = await readResponse(response);
            if (requestId !== statusRequest.current) return;
            if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível confirmar o estado do pipeline.');
            setScraperError(null);
            const fence = triggerFence.current;
            if (fence) {
                const returnedRunId = data.runId || data.lastRun?.runId;
                const startedAt = new Date(data.startedAt || data.startTime || data.lastRun?.startedAt || 0).getTime();
                const newerRun = (returnedRunId && fence.runId && returnedRunId !== fence.runId) ||
                    (startedAt > fence.startTime && (fence.startTime > 0 || startedAt >= fence.requestedAt - 5000));
                if (!newerRun) {
                    if (!triggerPending.current) {
                        setRunningOp(null);
                        wasRunning.current = false;
                        setOpOutput({ status: 'unknown', message: 'Ainda não há confirmação de uma nova execução. Atualize o estado antes de repetir o pedido.' });
                    }
                    return;
                }
                triggerFence.current = null;
            }
            setScraperState(data);
            setScraperElapsedSecs(data.elapsedSeconds ?? 0);
            const lastRun = lastRunFrom(data);
            if (lastRun) setLastScrapeResult(lastRun);
            if (data.isRunning) {
                wasRunning.current = true;
                setRunningOp('unified_scrape');
                setOpOutput({ status: 'running', message: 'Sincronização em execução no servidor.' });
            } else {
                // The trigger endpoint may stay open for the entire run. Keep polling while it
                // acquires the lock, without mistaking a previous run for this one's completion.
                if (triggerPending.current && !wasRunning.current) return;
                const hadRun = wasRunning.current;
                wasRunning.current = false;
                setRunningOp(null);
                if (hadRun) {
                    const status = data.interrupted ? 'interrupted' : lastRun?.status || data.status || 'unknown';
                    setOpOutput({
                        status,
                        message: data.message || ({
                            success: 'Sincronização concluída. Consulte as métricas processadas e o inventário atualizado.',
                            partial: 'Sincronização concluída parcialmente. Reveja as fontes e os logs.',
                            error: 'A sincronização terminou com erro. Consulte os logs.',
                            interrupted: 'A sincronização foi interrompida. Pode retomar a operação.',
                        }[status] || 'O servidor não confirmou o resultado desta execução. Consulte o histórico antes de iniciar outra.'),
                    });
                    reloadStatsRef.current(true);
                } else setOpOutput(null);
            }
        } catch (error) { if (requestId === statusRequest.current) setScraperError(error.message); }
    }, [authFetch]);

    const handleRunOperation = async (fullHistorical = false) => {
        if (triggerPending.current || runningOp) return;
        triggerPending.current = true;
        triggerFence.current = {
            runId: scraperState.runId || lastScrapeResult?.runId,
            startTime: new Date(scraperState.startedAt || scraperState.startTime || lastScrapeResult?.startedAt || 0).getTime(),
            requestedAt: Date.now(),
        };
        ++statusRequest.current; // Ignore any status response from before this trigger.
        setRunningOp('starting');
        setScraperState({});
        setScraperElapsedSecs(0);
        setScraperError(null);
        setOpOutput({ status: 'loading', message: 'A pedir ao servidor para iniciar a sincronização…' });
        let confirmedRun = false;
        try {
            // Do not retry this mutating GET; a network error does not prove that it failed to start.
            const response = await authFetch(fullHistorical ? '/api/force-scrape?history=true' : '/api/force-scrape', {}, 0);
            const data = await readResponse(response);
            if (response.status === 409 && data.alreadyRunning) {
                triggerFence.current = null; // Reconnect to the lock holder, even if it predates our request.
                confirmedRun = true;
                setOpOutput({ status: 'running', message: 'Já existe uma sincronização em execução. A ligar ao progresso existente…' });
            } else if (!response.ok || data.success === false) {
                // A 500 can describe a completed partial run, rather than a rejected trigger.
                confirmedRun = true;
                setOpOutput({ status: 'error', message: data.error || 'A sincronização terminou com erros. A consultar o resumo…' });
            } else {
                confirmedRun = true;
                setOpOutput({ status: 'running', message: 'Pedido aceite. A consultar o progresso no servidor…' });
            }
        } catch {
            confirmedRun = true;
            setOpOutput({ status: 'unknown', message: 'Ligação interrompida. A consultar o estado sem repetir o pedido de execução.' });
        } finally {
            triggerPending.current = false;
            wasRunning.current = confirmedRun;
            setRunningOp(confirmedRun ? 'unified_scrape' : null);
            if (confirmedRun) await checkScraperStatus();
        }
    };

    useEffect(() => {
        // Hydration of browser-only theme/hash state happens after the server render.
        setMounted(true);
        const readTab = () => {
            const tab = window.location.hash.slice(1);
            if (tabs.some(item => item.id === tab)) setActiveTab(tab);
        };
        readTab();
        window.addEventListener('hashchange', readTab);
        return () => window.removeEventListener('hashchange', readTab);
    }, []);

    // Preserve exclusion of this admin device from audience analytics.
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        try {
            localStorage.setItem('cc_admin_device', 'true');
            document.cookie = 'cc_admin_device=1; path=/; max-age=31536000; SameSite=Lax';
        } catch { /* Storage may be disabled. */ }
    }, [isLoaded, isSignedIn]);

    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        loadStats();
    }, [isLoaded, isSignedIn, loadStats]);
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        loadUsers();
    }, [isLoaded, isSignedIn, loadUsers]);
    useEffect(() => {
        if (!isLoaded || !isSignedIn) return;
        checkScraperStatus();
    }, [isLoaded, isSignedIn, checkScraperStatus]);
    useEffect(() => {
        if (!isLoaded || !isSignedIn || activeTab !== 'logs') return;
        const timer = setTimeout(loadLogs, 250);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- This is an invalidation counter, not a DOM ref.
        return () => { clearTimeout(timer); ++logsRequest.current; };
    }, [isLoaded, isSignedIn, activeTab, loadLogs]);
    useEffect(() => {
        if (!isSignedIn || !autoRefreshStats || activeTab !== 'stats') return;
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') loadStats(true);
        }, 15000);
        return () => clearInterval(timer);
    }, [isSignedIn, autoRefreshStats, activeTab, loadStats]);
    useEffect(() => {
        if (!isSignedIn || !autoRefreshLogs || activeTab !== 'logs') return;
        const timer = setInterval(() => {
            if (document.visibilityState === 'visible') loadLogs();
        }, 10000);
        return () => clearInterval(timer);
    }, [isSignedIn, autoRefreshLogs, activeTab, loadLogs]);
    useEffect(() => {
        if (!isSignedIn || (!runningOp && activeTab !== 'operations')) return;
        // Serialize polls so a slow response cannot overwrite a newer run state.
        let stopped = false;
        let timer;
        const poll = async () => {
            await checkScraperStatus();
            if (!stopped) timer = setTimeout(poll, runningOp ? 1500 : 15000);
        };
        timer = setTimeout(poll, runningOp ? 1500 : 15000);
        return () => { stopped = true; clearTimeout(timer); };
    }, [isSignedIn, runningOp, activeTab, checkScraperStatus]);
    useEffect(() => {
        if (!runningOp || runningOp === 'starting') return;
        const timer = setInterval(() => setScraperElapsedSecs(value => value + 1), 1000);
        return () => clearInterval(timer);
    }, [runningOp]);

    const navigate = tab => {
        setActiveTab(tab);
        window.history.replaceState(null, '', `#${tab}`);
    };

    const closeDialog = () => {
        if (actionBusy) return;
        setRoleChangeTarget(null);
        setDeleteTarget(null);
        setClearLogsTarget(null);
        setActionMessage(null);
    };
    const openRole = (user, newRole) => { setActionMessage(null); setRoleChangeTarget({ user, newRole }); };
    const openDelete = (user, mode) => { setActionMessage(null); setDeleteTarget({ user, mode }); };
    const openClear = all => { setActionMessage(null); setClearLogsTarget({ all }); };

    const executeAction = async () => {
        if (actionBusy) return;
        setActionBusy(true);
        setActionMessage(null);
        try {
            let response;
            if (roleChangeTarget) {
                response = await authFetch(`/api/admin/users/${encodeURIComponent(roleChangeTarget.user.id)}/role`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ newRole: roleChangeTarget.newRole }),
                });
            } else if (deleteTarget) {
                response = await authFetch(`/api/admin/users/${encodeURIComponent(deleteTarget.user.id)}?mode=${deleteTarget.mode}`, { method: 'DELETE' });
            } else if (clearLogsTarget) {
                response = await authFetch(`/api/admin/logs?${clearLogsTarget.all ? 'all=true' : 'days=30'}`, { method: 'DELETE' });
            } else return;
            const data = await readResponse(response);
            if (!response.ok || !data.success) throw new Error(data.error || 'Não foi possível concluir a ação.');
            setActionMessage({ type: 'success', text: data.message || 'Ação concluída.' });
            await Promise.all([loadStats(true), clearLogsTarget ? loadLogs() : loadUsers()]);
        } catch (error) { setActionMessage({ type: 'error', text: error.message }); }
        finally { setActionBusy(false); }
    };

    const handleCopyLog = async log => {
        const details = typeof log.details === 'object' ? JSON.stringify(log.details, null, 2) : log.details;
        try {
            await navigator.clipboard.writeText(`[${log.createdAt}] [${log.level}] [${log.source}]\n${log.message}\n\n${details || 'Sem detalhes'}`);
            setCopiedLogId(log.id);
            setTimeout(() => setCopiedLogId(null), 2000);
        } catch { setError('logs', 'Não foi possível copiar. Pode selecionar o texto nos detalhes.'); }
    };
    const retry = () => {
        if (activeTab === 'users') loadUsers();
        else if (activeTab === 'logs') loadLogs();
        else if (activeTab === 'operations') checkScraperStatus();
        else loadStats();
    };
    const visibleError = errors[activeTab === 'inventory' ? 'stats' : activeTab];
    const modalTitle = roleChangeTarget ? 'Alterar permissões' : deleteTarget ? deleteTarget.mode === 'delete_data' ? 'Limpar dados do utilizador' : 'Eliminar conta permanentemente' : clearLogsTarget?.all ? 'Eliminar todos os logs?' : 'Limpar logs antigos?';

    return <AdminDashboardView activeTab={activeTab} navigate={navigate} running={runningOp} pendingDeletions={pendingDeletionsCount} dark={mounted && resolvedTheme === 'dark'} onToggleTheme={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')} error={visibleError} onRetry={retry} dialog={
        (roleChangeTarget || deleteTarget || clearLogsTarget) && <ConfirmDialog title={modalTitle} onClose={closeDialog} onConfirm={executeAction} busy={actionBusy} message={actionMessage} danger={!!deleteTarget || !!clearLogsTarget} confirmLabel={deleteTarget?.mode === 'delete_account' ? 'Eliminar permanentemente' : 'Confirmar ação'}>
            {roleChangeTarget && <><p>Alterar o cargo de <strong>{roleChangeTarget.user.fullName || roleChangeTarget.user.email}</strong> ({roleChangeTarget.user.email}) para <strong>{roleChangeTarget.newRole === 'admin' ? 'administrador' : 'utilizador'}</strong>?</p><p>Esta alteração afeta o acesso às ferramentas de administração.</p></>}
            {deleteTarget && <><p><strong>{deleteTarget.user.fullName || 'Utilizador'}</strong><br />{deleteTarget.user.email}</p>{deleteTarget.user.deletionReason && <p>Motivo indicado: {deleteTarget.user.deletionReason}</p>}<Notice error>{deleteTarget.mode === 'delete_data' ? 'Todos os favoritos e preferências serão removidos. A conta mantém-se ativa.' : 'A conta será apagada permanentemente do sistema de autenticação (Clerk). Esta ação não pode ser desfeita.'}</Notice></>}
            {clearLogsTarget && <p>{clearLogsTarget.all ? 'Todos os logs do sistema serão eliminados permanentemente, incluindo os que não correspondem aos filtros atuais.' : 'Os logs do sistema com mais de 30 dias serão eliminados permanentemente. Os registos mais recentes serão mantidos.'}</p>}
        </ConfirmDialog>
    }>
            {activeTab === 'stats' && <Overview stats={stats} busy={isLoadingStats} refreshing={isLiveRefreshing} timeframe={analyticsTimeframe} setTimeframe={setAnalyticsTimeframe} autoRefresh={autoRefreshStats} setAutoRefresh={setAutoRefreshStats} refresh={() => loadStats()} navigate={navigate} pendingDeletions={pendingDeletionsCount} lastRun={lastScrapeResult} running={runningOp} />}
            {activeTab === 'inventory' && <Inventory events={stats?.events} busy={isLoadingStats} refresh={() => loadStats()} />}
            {activeTab === 'operations' && <Operations running={runningOp} output={opOutput} sources={scraperState.sources} steps={scraperState.steps} activeStep={scraperState.activeStep} elapsed={scraperElapsedSecs} lastRun={lastScrapeResult} currentRun={scraperState} logs={scraperState.logs || []} onRun={handleRunOperation} onRefresh={checkScraperStatus} onLogs={() => navigate('logs')} onClear={() => openClear(false)} clearing={actionBusy} statusError={scraperError} />}
            {activeTab === 'users' && <Users users={filteredUsers} total={users.length} busy={isLoadingUsers} search={userSearch} setSearch={setUserSearch} roleFilter={userRoleFilter} setRoleFilter={setUserRoleFilter} pending={pendingDeletionsCount} refresh={loadUsers} onRole={openRole} onDelete={openDelete} />}
            {activeTab === 'logs' && <Logs logs={logs} busy={isLoadingLogs} search={logSearch} setSearch={setLogSearch} level={logLevelFilter} setLevel={setLogLevelFilter} source={logSourceFilter} setSource={setLogSourceFilter} autoRefresh={autoRefreshLogs} setAutoRefresh={setAutoRefreshLogs} refresh={loadLogs} expanded={expandedLogId} setExpanded={setExpandedLogId} copied={copiedLogId} onCopy={handleCopyLog} onClear={openClear} clearing={actionBusy} />}
    </AdminDashboardView>;
}
