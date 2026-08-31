import { CALENDAR_PATH, BICYCLE_PATH } from '../lib/brand';

export default function DynamicLogo({ className = 'w-8 h-8' }) {
    return (
        <svg viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
            <rect width="64" height="64" rx="16" fill="var(--site-logo-bg)" />
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d={CALENDAR_PATH} stroke="#e7eef4" strokeWidth="3" />
                <g stroke="var(--site-mark)" strokeWidth="2.8">
                    <circle cx="22" cy="44" r="8" /><circle cx="47" cy="44" r="8" />
                    <path d={BICYCLE_PATH} />
                </g>
            </g>
        </svg>
    );
}
