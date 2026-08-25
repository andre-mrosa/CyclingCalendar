'use client';

import React, { useState, useEffect } from 'react';

export default function DynamicLogo({ className = "w-8 h-8", dayNumber }) {
    const [today, setToday] = useState(dayNumber || new Date().getDate());

    useEffect(() => {
        const currentDay = new Date().getDate();
        setToday(currentDay);

        // Update favicon dynamically in real-time in browser tab (Google Calendar Style)
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // 1. Solid Royal Blue Squircle Base
                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.roundRect(0, 0, 64, 64, 15);
                ctx.fill();

                // 2. Scott Foil Bike Silhouette in background (Soft white tint)
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
                ctx.lineWidth = 2.2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Wheels
                ctx.beginPath();
                ctx.arc(15, 36, 10, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(49, 36, 10, 0, Math.PI * 2);
                ctx.stroke();

                // Frame
                ctx.beginPath();
                ctx.moveTo(15, 36);
                ctx.lineTo(24, 26);
                ctx.lineTo(26, 16);
                ctx.lineTo(43, 16);
                ctx.lineTo(49, 36);
                ctx.stroke();

                // 3. Foreground: HUGE PURE WHITE BOLD DAY NUMBER (Google Calendar style)
                ctx.fillStyle = '#ffffff';
                ctx.font = '900 36px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(currentDay.toString(), 32, 34);

                // Update link icon in head
                let link = document.querySelector("link[rel*='icon']");
                if (!link) {
                    link = document.createElement('link');
                    link.rel = 'icon';
                    document.head.appendChild(link);
                }
                link.href = canvas.toDataURL('image/png');
            }
        } catch (e) {
            // Silently fallback if canvas is unsupported
        }
    }, []);

    return (
        <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 120 120" 
            className={className}
        >
            <defs>
                <linearGradient id="solidBlueGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#1d4ed8"/>
                </linearGradient>

                <linearGradient id="topGlow" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18"/>
                    <stop offset="50%" stopColor="#ffffff" stopOpacity="0"/>
                </linearGradient>

                <filter id="numShadow" x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.45"/>
                </filter>
            </defs>

            {/* 1. Solid Blue Squircle Base */}
            <rect width="120" height="120" rx="26" ry="26" fill="url(#solidBlueGrad)"/>
            <rect width="120" height="120" rx="26" ry="26" fill="url(#topGlow)"/>

            {/* 2. Scott Foil RC 2026 Silhouette in Background */}
            <g stroke="#ffffff" strokeOpacity="0.32" strokeLinecap="round" strokeLinejoin="round" fill="none">
                {/* Deep section 50mm Carbon Aero Wheels */}
                <circle cx="28" cy="64" r="19" strokeWidth="4.5"/>
                <circle cx="28" cy="64" r="13.5" strokeWidth="1.5"/>
                
                <circle cx="92" cy="64" r="19" strokeWidth="4.5"/>
                <circle cx="92" cy="64" r="13.5" strokeWidth="1.5"/>

                {/* Scott Foil Frame lines */}
                <line x1="28" y1="64" x2="52" y2="64" strokeWidth="4.5"/>
                <line x1="28" y1="64" x2="43" y2="47" strokeWidth="3.8"/>
                <path d="M43 47 C44 53, 48 59, 52 64" strokeWidth="5"/>
                <line x1="43" y1="47" x2="46" y2="30" strokeWidth="5"/>

                <line x1="46" y1="30" x2="80" y2="30" strokeWidth="4.8"/>
                <line x1="52" y1="64" x2="80" y2="30" strokeWidth="5.5"/>
                <line x1="80" y1="30" x2="92" y2="64" strokeWidth="4.8"/>

                {/* Cockpit & Seatpost */}
                <path d="M78 30 L83 22 L90 22 C92 22, 93 25, 92 28 L87 32" strokeWidth="4"/>
                <line x1="46" y1="30" x2="44.5" y2="22" strokeWidth="4.5"/>
                <path d="M35 20 C39 19, 49 19, 52 21 C50 23, 45 23, 39 22 Z" fill="#ffffff" fillOpacity="0.32" strokeWidth="1"/>
            </g>

            {/* 3. Foreground: HUGE PURE WHITE DAY NUMBER (Exact Google Calendar Style) */}
            <text 
                x="60" 
                y="79" 
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif" 
                fontSize="62" 
                fontWeight="900" 
                fill="#ffffff" 
                textAnchor="middle" 
                letterSpacing="-3"
                filter="url(#numShadow)"
            >
                {today}
            </text>
        </svg>
    );
}
