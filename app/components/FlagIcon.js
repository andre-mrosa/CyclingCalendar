import React from 'react';

export default function FlagIcon({ code, className = "w-4 h-2.5 rounded-[2px] shadow-[0_0_0_1px_rgba(0,0,0,0.15)] shrink-0 overflow-hidden" }) {
    switch (code) {
        case 'pt':
            return (
                <svg viewBox="0 0 600 400" className={className} xmlns="http://www.w3.org/2000/svg">
                    <rect width="600" height="400" fill="#dc2626" />
                    <rect width="240" height="400" fill="#15803d" />
                    <circle cx="240" cy="200" r="70" fill="#eab308" stroke="#000" strokeWidth="4" />
                    <path d="M210 160 h60 v50 a30 30 0 0 1 -60 0 z" fill="#ffffff" stroke="#dc2626" strokeWidth="6" />
                    <path d="M225 175 h30 v25 a15 15 0 0 1 -30 0 z" fill="#1d4ed8" />
                </svg>
            );
        case 'en':
            return (
                <svg viewBox="0 0 60 30" className={className} xmlns="http://www.w3.org/2000/svg">
                    <clipPath id="uk-clip"><path d="M0,0 v30 h60 v-30 z"/></clipPath>
                    <clipPath id="uk-diag"><path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/></clipPath>
                    <g clipPath="url(#uk-clip)">
                        <path d="M0,0 v30 h60 v-30 z" fill="#1e3a8a"/>
                        <path d="M0,0 L60,30 M60,0 L0,30" stroke="#ffffff" strokeWidth="6"/>
                        <path d="M0,0 L60,30 M60,0 L0,30" clipPath="url(#uk-diag)" stroke="#dc2626" strokeWidth="4"/>
                        <path d="M30,0 v30 M0,15 h60" stroke="#ffffff" strokeWidth="10"/>
                        <path d="M30,0 v30 M0,15 h60" stroke="#dc2626" strokeWidth="6"/>
                    </g>
                </svg>
            );
        case 'es':
            return (
                <svg viewBox="0 0 750 500" className={className} xmlns="http://www.w3.org/2000/svg">
                    <rect width="750" height="500" fill="#dc2626" />
                    <rect width="750" height="250" y="125" fill="#facc15" />
                    <circle cx="180" cy="250" r="40" fill="#dc2626" opacity="0.85" />
                </svg>
            );
        case 'fr':
            return (
                <svg viewBox="0 0 900 600" className={className} xmlns="http://www.w3.org/2000/svg">
                    <rect width="900" height="600" fill="#dc2626" />
                    <rect width="600" height="600" fill="#ffffff" />
                    <rect width="300" height="600" fill="#1d4ed8" />
                </svg>
            );
        default:
            return null;
    }
}
