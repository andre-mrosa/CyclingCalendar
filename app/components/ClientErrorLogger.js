'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';

// Cache para evitar spam de erros duplicados (limite de 1 envio por minuto para o mesmo erro)
const reportedErrorsCache = new Map();

function reportClientError(errorData) {
    try {
        const key = `${errorData.message || ''}_${errorData.url || ''}_${errorData.lineno || ''}`;
        const now = Date.now();
        const lastReported = reportedErrorsCache.get(key);

        if (lastReported && now - lastReported < 60000) {
            // Ignorar erro repetido nos últimos 60 segundos
            return;
        }

        reportedErrorsCache.set(key, now);

        // Limpar cache antigo
        if (reportedErrorsCache.size > 50) {
            reportedErrorsCache.clear();
        }

        const payload = {
            ...errorData,
            pathname: window.location.pathname,
            url: window.location.href,
            userAgent: navigator.userAgent
        };

        if (navigator.sendBeacon) {
            const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
            navigator.sendBeacon('/api/log-client-error', blob);
        } else {
            fetch('/api/log-client-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                keepalive: true
            }).catch(() => {});
        }
    } catch {}
}

export default function ClientErrorLogger() {
    const pathname = usePathname();

    useEffect(() => {
        // 1. Capturar erros de JavaScript gerais no window
        const handleError = (event) => {
            const { message, filename, lineno, colno, error } = event;
            reportClientError({
                message: message || error?.message || 'Erro de execução JavaScript',
                source: filename,
                lineno,
                colno,
                stack: error?.stack || null
            });
        };

        // 2. Capturar Promises rejeitadas sem catch
        const handleUnhandledRejection = (event) => {
            const reason = event.reason;
            const message = reason?.message || (typeof reason === 'string' ? reason : 'Promise rejeitada sem tratamento');
            reportClientError({
                message: `[UnhandledPromise] ${message}`,
                stack: reason?.stack || null
            });
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, [pathname]);

    return null;
}
