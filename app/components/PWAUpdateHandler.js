'use client';

import { useEffect } from 'react';

/**
 * PWAUpdateHandler
 * 
 * Manages Service Worker lifecycle and provides self-healing recovery
 * from ChunkLoadErrors when new deployments go live on Vercel.
 */
export default function PWAUpdateHandler() {
    useEffect(() => {
        if (typeof window === 'undefined') return;

        // 1. Recovery mechanism for ChunkLoadError (stale deployment chunks)
        const isChunkError = (message) => {
            if (!message || typeof message !== 'string') return false;
            const lower = message.toLowerCase();
            return (
                lower.includes('loading chunk') ||
                lower.includes('chunkloaderror') ||
                lower.includes('failed to fetch dynamically imported module') ||
                lower.includes('unexpected token \'<\'') ||
                lower.includes('unexpected token <')
            );
        };

        const recoverFromStaleChunk = () => {
            const lastReload = sessionStorage.getItem('pwa_chunk_recovery_time');
            const now = Date.now();

            // Prevent reload loop: only attempt reload once every 10 seconds
            if (!lastReload || now - parseInt(lastReload, 10) > 10000) {
                sessionStorage.setItem('pwa_chunk_recovery_time', now.toString());
                
                // Clear Service Worker caches
                if ('caches' in window) {
                    caches.keys().then((names) => {
                        names.forEach((name) => {
                            if (name.includes('pages') || name.includes('workbox-precache')) {
                                caches.delete(name);
                            }
                        });
                    }).catch(() => {});
                }

                // Force hard reload
                window.location.reload();
            }
        };

        const handleError = (event) => {
            if (isChunkError(event?.message) || isChunkError(event?.error?.message)) {
                console.warn('[PWA] Stale chunk detected. Recovering...');
                recoverFromStaleChunk();
            }
        };

        const handleUnhandledRejection = (event) => {
            const reason = event?.reason;
            const message = reason?.message || (typeof reason === 'string' ? reason : '');
            if (isChunkError(message)) {
                console.warn('[PWA] Unhandled promise rejection from stale chunk. Recovering...');
                recoverFromStaleChunk();
            }
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleUnhandledRejection);

        // 2. Service Worker update listener
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.ready.then((registration) => {
                // Check for SW update on app launch
                registration.update().catch(() => {});

                // Listen for incoming new service worker
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    if (newWorker) {
                        newWorker.addEventListener('statechange', () => {
                            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                                // New update is available; activate it immediately
                                newWorker.postMessage({ type: 'SKIP_WAITING' });
                            }
                        });
                    }
                });
            }).catch(() => {});

            // Handle controller change cleanly
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) {
                    refreshing = true;
                    // If the page was stuck or needed fresh chunks, silent reload
                    const wasStuck = sessionStorage.getItem('pwa_chunk_recovery_time');
                    if (wasStuck) {
                        sessionStorage.removeItem('pwa_chunk_recovery_time');
                        window.location.reload();
                    }
                }
            });
        }

        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleUnhandledRejection);
        };
    }, []);

    return null;
}
