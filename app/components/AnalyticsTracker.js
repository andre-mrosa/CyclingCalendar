'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { useUser } from '@clerk/nextjs';

/**
 * Função utilitária global para registar eventos customizados a partir de qualquer componente
 */
export function trackEvent(type, data = {}) {
    if (typeof window === 'undefined') return;
    if (typeof window.__trackCCEvent === 'function') {
        window.__trackCCEvent(type, data);
    }
}

export default function AnalyticsTracker() {
    const pathname = usePathname();
    const { user, isLoaded } = useUser();
    const sessionStartRef = useRef(Date.now());
    const lastHeartbeatRef = useRef(Date.now());
    const initialReferrerRef = useRef(typeof document !== 'undefined' ? document.referrer : '');

    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 1. Verificar se este dispositivo pertence ao Administrador (Mobile ou PC)
        const isAdminUser = 
            user?.publicMetadata?.role === 'admin' ||
            user?.id === 'user_3HpcOqdlvjNVk8LTexM9hXcP5DE' ||
            user?.id === 'user_3HoiHwpGl9suYXrYx0QFhDMXHWD' ||
            user?.primaryEmailAddress?.emailAddress?.toLowerCase().includes('andre.rosa') ||
            user?.primaryEmailAddress?.emailAddress?.toLowerCase().includes('andremrosa');

        const isKnownAdminDevice = 
            localStorage.getItem('cc_admin_device') === 'true' ||
            document.cookie.includes('cc_admin_device=1') ||
            pathname?.startsWith('/admin');

        if (isAdminUser || isKnownAdminDevice) {
            // Marcar este dispositivo permanentemente como Admin Device
            try {
                localStorage.setItem('cc_admin_device', 'true');
                document.cookie = "cc_admin_device=1; path=/; max-age=31536000; SameSite=Lax";
            } catch {}

            // IMPORTANTE: NÃO REGISTAR QUALQUER TELEMETRIA PARA O ADMIN
            return;
        }

        // Se ainda não carregou o Clerk e não temos certeza, aguardar
        if (!isLoaded) return;

        // 2. Obter ou gerar Visitor ID persistente para visitantes reais
        let visitorId = localStorage.getItem('cc_vid');
        if (!visitorId) {
            visitorId = 'v_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now().toString(36);
            try {
                localStorage.setItem('cc_vid', visitorId);
            } catch {}
        }

        // 3. Obter ou gerar Session ID para esta visita
        let sessionId = sessionStorage.getItem('cc_sid');
        if (!sessionId) {
            sessionId = 's_' + visitorId.slice(2, 10) + '_' + Date.now().toString(36);
            try {
                sessionStorage.setItem('cc_sid', sessionId);
            } catch {}
        }

        // 4. Função de envio de telemetria
        const sendTrack = (type, extra = {}, useBeacon = false) => {
            try {
                const now = Date.now();
                const deltaSeconds = Math.max(1, Math.round((now - lastHeartbeatRef.current) / 1000));
                lastHeartbeatRef.current = now;

                const payload = {
                    visitorId,
                    sessionId,
                    type,
                    path: pathname || '/',
                    referrer: initialReferrerRef.current || null,
                    duration: deltaSeconds,
                    ...extra
                };

                const jsonStr = JSON.stringify(payload);

                if (useBeacon && typeof navigator !== 'undefined' && navigator.sendBeacon) {
                    const blob = new Blob([jsonStr], { type: 'application/json' });
                    navigator.sendBeacon('/api/analytics/track', blob);
                } else {
                    fetch('/api/analytics/track', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: jsonStr,
                        keepalive: true
                    }).catch(() => {});
                }
            } catch {}
        };

        // Registo da função no window para acesso global
        window.__trackCCEvent = (type, extra = {}) => {
            sendTrack(type, extra, false);
        };

        // 5. Registar Page View ao carregar ou mudar de página
        sendTrack('PAGE_VIEW', { path: pathname });

        // 6. Heartbeat periódico a cada 30 segundos para atualizar duração
        const heartbeatInterval = setInterval(() => {
            if (document.visibilityState === 'visible') {
                sendTrack('PING', { path: pathname }, false);
            }
        }, 30000);

        // 7. Enviar duração acumulada ao fechar ou esconder o separador
        const handleVisibilityChange = () => {
            if (document.visibilityState === 'hidden') {
                sendTrack('PING', { path: pathname }, true);
            } else {
                lastHeartbeatRef.current = Date.now();
            }
        };

        const handlePageHide = () => {
            sendTrack('PING', { path: pathname }, true);
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('pagehide', handlePageHide);

        return () => {
            clearInterval(heartbeatInterval);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('pagehide', handlePageHide);
        };
    }, [pathname, user, isLoaded]);

    return null;
}
