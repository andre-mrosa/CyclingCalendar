'use client';

import React, { useState, useEffect } from 'react';

export default function DynamicLogo({ className = "w-8 h-8", dayNumber }) {
    const [today, setToday] = useState(dayNumber || new Date().getDate());

    useEffect(() => {
        const currentDay = new Date().getDate();
        setToday(currentDay);

        // Update favicon dynamically in real-time in browser tab
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // 1. Royal blue squircle base
                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.roundRect(0, 0, 64, 64, 15);
                ctx.fill();

                // 2. Scott Foil RC 2026 silhouette in crisp white
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Deep-section carbon aero wheels
                ctx.beginPath();
                ctx.arc(14, 34, 10, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(50, 34, 10, 0, Math.PI * 2);
                ctx.stroke();

                // Scott Foil dropped seatstay & frame
                ctx.beginPath();
                ctx.moveTo(14, 34);
                ctx.lineTo(23, 25); // low dropped seatstay
                ctx.lineTo(25, 16); // seatpost junction
                ctx.lineTo(43, 16); // top tube
                ctx.lineTo(50, 34); // fork
                ctx.stroke();

                // Integrated aero cockpit
                ctx.beginPath();
                ctx.moveTo(43, 16);
                ctx.lineTo(48, 12);
                ctx.lineTo(50, 16);
                ctx.stroke();

                // 3. Central Calendar Badge: 100% ALL-WHITE (no blue bar)
                // Protective dark blue halo
                ctx.fillStyle = '#1e40af';
                ctx.beginPath();
                ctx.roundRect(17, 18, 30, 30, 7);
                ctx.fill();

                // Solid all-white card
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.roundRect(18, 19, 28, 28, 6);
                ctx.fill();

                // Big Day text in center (ultra crisp & readable)
                ctx.fillStyle = '#0f172a';
                ctx.font = '900 16px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(currentDay.toString(), 32, 33);

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
                <linearGradient id="foilBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb"/>
                    <stop offset="100%" stopColor="#1d4ed8"/>
                </linearGradient>
                <linearGradient id="foilGloss" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.16"/>
                    <stop offset="60%" stopColor="#ffffff" stopOpacity="0"/>
                </linearGradient>
                <filter id="foilShadow" x="-15%" y="-15%" width="130%" height="130%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.4"/>
                </filter>
            </defs>

            {/* 1. Squircle Base Canvas */}
            <rect width="120" height="120" rx="28" ry="28" fill="url(#foilBgGrad)"/>
            <rect width="120" height="120" rx="28" ry="28" fill="url(#foilGloss)"/>

            {/* 2. SCOTT FOIL RC 2026 Silhouette in Crisp Pure White */}
            <g stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" fill="none">
                {/* Deep-Section 50mm Carbon Aero Wheels */}
                <circle cx="26" cy="64" r="18.5" strokeWidth="4.5" strokeOpacity="0.95"/>
                <circle cx="26" cy="64" r="13" strokeWidth="1.5" strokeOpacity="0.35"/>
                
                <circle cx="94" cy="64" r="18.5" strokeWidth="4.5" strokeOpacity="0.95"/>
                <circle cx="94" cy="64" r="13" strokeWidth="1.5" strokeOpacity="0.35"/>

                {/* Scott Foil RC Rear Triangle with Ultra-Dropped Seatstays & Wheel Hugging Seat Tube */}
                <line x1="26" y1="64" x2="52" y2="64" strokeWidth="4.5"/>
                <line x1="26" y1="64" x2="43" y2="47" strokeWidth="3.8"/>
                <path d="M43 47 C44 53, 48 59, 52 64" strokeWidth="5"/>
                <line x1="43" y1="47" x2="46" y2="30" strokeWidth="5"/>

                {/* Scott Foil Truncated Airfoil Top Tube */}
                <line x1="46" y1="30" x2="81" y2="30" strokeWidth="4.8"/>

                {/* Scott Foil Massive Aero Downtube */}
                <line x1="52" y1="64" x2="81" y2="30" strokeWidth="5.5"/>

                {/* Scott Foil Aero Bladed Front Fork */}
                <line x1="81" y1="30" x2="94" y2="64" strokeWidth="4.8"/>

                {/* Syncros Creston iC SL Aero Cockpit */}
                <path d="M79 30 L84 22 L91 22 C93 22, 94 25, 93 28 L88 32" strokeWidth="4.2"/>

                {/* Syncros Duncan SL Aero Comfort Seatpost & Saddle */}
                <line x1="46" y1="30" x2="44.5" y2="22" strokeWidth="4.5"/>
                <path d="M35 20 C39 19, 49 19, 52 21 C50 23, 45 23, 39 22 Z" fill="#ffffff" strokeWidth="1.5"/>
            </g>

            {/* 3. Central Calendar Badge: 100% PURE ALL-WHITE CARD (No blue bar) */}
            <g filter="url(#foilShadow)">
                {/* Protective Halo */}
                <rect x="33" y="35" width="54" height="54" rx="14" ry="14" fill="#1e40af" stroke="#1d4ed8" strokeWidth="2"/>
                
                {/* 100% Solid White Calendar Card */}
                <rect x="35" y="37" width="50" height="50" rx="12" ry="12" fill="#ffffff"/>

                {/* Top Binder Loops */}
                <rect x="45.5" y="33" width="4.5" height="7.5" rx="2.25" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2"/>
                <rect x="70" y="33" width="4.5" height="7.5" rx="2.25" fill="#ffffff" stroke="#94a3b8" strokeWidth="1.2"/>

                {/* Big, Bold, Clean Day Number */}
                <text 
                    x="60" 
                    y="71" 
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
                    fontSize="28" 
                    fontWeight="900" 
                    fill="#0f172a" 
                    textAnchor="middle" 
                    letterSpacing="-1"
                >
                    {today}
                </text>
            </g>
        </svg>
    );
}
