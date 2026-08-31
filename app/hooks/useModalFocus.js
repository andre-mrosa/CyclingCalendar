"use client";
import { useEffect, useRef } from 'react';

/** Keep keyboard focus inside an open dialog, then return it to its trigger. */
export function useModalFocus(open, onEscape) {
    const ref = useRef(null);
    const escapeRef = useRef(onEscape);
    useEffect(() => { escapeRef.current = onEscape; }, [onEscape]);
    useEffect(() => {
        if (!open || !ref.current) return;
        const root = ref.current;
        const previousFocus = document.activeElement;
        const frame = requestAnimationFrame(() => root.focus({ preventScroll: true }));
        const handleKey = (event) => {
            if (!root.contains(document.activeElement)) return;
            if (event.key === 'Escape' && escapeRef.current) {
                event.preventDefault();
                escapeRef.current();
            }
            if (event.key !== 'Tab') return;
            const focusable = [...root.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
                .filter(element => !element.disabled && element.tabIndex >= 0 && element.getClientRects().length && !element.closest('[inert]'));
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (!first) { event.preventDefault(); root.focus(); }
            else if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) { event.preventDefault(); last.focus(); }
            else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
        };
        root.addEventListener('keydown', handleKey);
        return () => {
            cancelAnimationFrame(frame);
            root.removeEventListener('keydown', handleKey);
            if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
        };
    }, [open]);
    return ref;
}
