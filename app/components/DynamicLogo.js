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

                // 2. Bike lines in white
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 2.5;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Wheels
                ctx.beginPath();
                ctx.arc(14, 34, 9.5, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(50, 34, 9.5, 0, Math.PI * 2);
                ctx.stroke();

                // Frame
                ctx.beginPath();
                ctx.moveTo(14, 34);
                ctx.lineTo(24, 24); // Dropped seatstay
                ctx.lineTo(26, 15); // Seatpost
                ctx.lineTo(43, 15); // Top tube
                ctx.lineTo(50, 34); // Fork
                ctx.stroke();

                // Handlebars
                ctx.beginPath();
                ctx.moveTo(43, 15);
                ctx.lineTo(47, 11);
                ctx.lineTo(50, 15);
                ctx.stroke();

                // 3. Central Calendar Badge with protective dark blue halo
                ctx.fillStyle = '#1e40af';
                ctx.beginPath();
                ctx.roundRect(17, 18, 30, 31, 7);
                ctx.fill();

                // White calendar card
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.roundRect(18, 19, 28, 29, 6);
                ctx.fill();

                // Blue top bar
                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.roundRect(18, 19, 28, 7, [6, 6, 0, 0]);
                ctx.fill();

                // Big Day text in center
                ctx.fillStyle = '#0f172a';
                ctx.font = '900 15px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(currentDay.toString(), 32, 36.5);

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
                <linearGradient id="aeroBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#2563eb"/>
                    <stop offset="100%" stopColor="#1d4ed8"/>
                </linearGradient>
                <linearGradient id="glossHighlight" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity="0.18"/>
                    <stop offset="60%" stopColor="#ffffff" stopOpacity="0"/>
                </linearGradient>
                <filter id="softDepth" x="-15%" y="-15%" width="130%" height="130%">
                    <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#0f172a" floodOpacity="0.35"/>
                </filter>
            </defs>

            {/* 1. Squircle Base with Royal Blue Gradient */}
            <rect width="120" height="120" rx="28" ry="28" fill="url(#aeroBgGrad)"/>
            <rect width="120" height="120" rx="28" ry="28" fill="url(#glossHighlight)"/>

            {/* 2. Modern Aero Road Bike Silhouette */}
            <g stroke="#ffffff" strokeLinecap="round" strokeLinejoin="round" fill="none">
                {/* Deep Section Aero Wheels */}
                <circle cx="27" cy="62" r="18" strokeWidth="4.5" strokeOpacity="0.95"/>
                <circle cx="27" cy="62" r="13" strokeWidth="1.5" strokeOpacity="0.4"/>
                
                <circle cx="93" cy="62" r="18" strokeWidth="4.5" strokeOpacity="0.95"/>
                <circle cx="93" cy="62" r="13" strokeWidth="1.5" strokeOpacity="0.4"/>

                {/* Modern Aero Frame with Dropped Seatstays */}
                <line x1="27" y1="62" x2="44" y2="44" strokeWidth="4"/>
                <line x1="27" y1="62" x2="52" y2="62" strokeWidth="4"/>
                
                <line x1="44" y1="44" x2="48" y2="28" strokeWidth="4.5"/>
                <line x1="48" y1="28" x2="52" y2="62" strokeWidth="4.5"/>
                <line x1="48" y1="28" x2="80" y2="28" strokeWidth="4.5"/>
                <line x1="52" y1="62" x2="80" y2="28" strokeWidth="4.5"/>
                
                <line x1="80" y1="28" x2="93" y2="62" strokeWidth="4.5"/>

                {/* Aero Drop Handlebars */}
                <path d="M78 28 L84 21 L89 21 L90 27 L86 31" strokeWidth="4"/>
                
                {/* Racing Saddle */}
                <path d="M38 21 C42 20, 52 20, 55 22 C53 24, 48 24, 42 23 Z" fill="#ffffff" strokeWidth="1.5"/>
                <line x1="47" y1="23" x2="48" y2="28" strokeWidth="4"/>
            </g>

            {/* 3. Central Calendar Badge with Protective Halo and Prominent Day Number */}
            <g filter="url(#softDepth)">
                {/* Protective Halo separating badge from bike lines */}
                <rect x="33" y="34" width="54" height="56" rx="14" ry="14" fill="#1e40af" stroke="#1d4ed8" strokeWidth="2"/>
                
                {/* Solid White Calendar Card */}
                <rect x="35" y="36" width="50" height="52" rx="12" ry="12" fill="#ffffff"/>

                {/* Top Accent Stripe */}
                <path d="M35 48 C35 41.37, 40.37 36, 47 36 L73 36 C79.63 36, 85 41.37, 85 48 L85 49 L35 49 Z" fill="#2563eb"/>

                {/* Top Binding Loops */}
                <rect x="45" y="32" width="4.5" height="7.5" rx="2.25" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.2"/>
                <rect x="70.5" y="32" width="4.5" height="7.5" rx="2.25" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.2"/>

                {/* BIG, BOLD Dynamic Day Number in Center */}
                <text 
                    x="60" 
                    y="76" 
                    fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
                    fontSize="27" 
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
