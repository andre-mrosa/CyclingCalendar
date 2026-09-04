import { CALENDAR_PATH, BICYCLE_PATH } from '../lib/brand';

export default function DynamicLogo({ className = 'w-8 h-8' }) {
    return (
        <svg viewBox="0 0 64 64" className={`shrink-0 ${className}`} aria-hidden="true" focusable="false">
            <rect width="64" height="64" rx="14" fill="#0f172a" />
            <g fill="none" strokeLinecap="round" strokeLinejoin="round">
                <path d={CALENDAR_PATH} stroke="#94a3b8" strokeWidth="3" />
                <g stroke="#22c55e" strokeWidth="3">
                    <circle cx="22" cy="44" r="8" /><circle cx="47" cy="44" r="8" />
                    <path d={BICYCLE_PATH} />
                </g>
            </g>
        </svg>
    );
}
