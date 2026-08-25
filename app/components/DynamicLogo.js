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
                // 1. Calendar Card Base (White with soft rounded corners)
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.roundRect(4, 4, 56, 56, 12);
                ctx.fill();

                // 2. Top Header Bar (Vibrant Blue)
                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.roundRect(4, 4, 56, 18, [12, 12, 0, 0]);
                ctx.fill();

                // Calendar Binder Rings
                ctx.fillStyle = '#94a3b8';
                ctx.beginPath();
                ctx.roundRect(18, 2, 4, 6, 2);
                ctx.roundRect(42, 2, 4, 6, 2);
                ctx.fill();

                // 3. Scott Foil Bike Silhouette in background (Soft blue-gray tint)
                ctx.strokeStyle = '#93c5fd';
                ctx.lineWidth = 1.8;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Wheels
                ctx.beginPath();
                ctx.arc(16, 42, 9, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(48, 42, 9, 0, Math.PI * 2);
                ctx.stroke();

                // Bike frame lines
                ctx.beginPath();
                ctx.moveTo(16, 42);
                ctx.lineTo(26, 32);
                ctx.lineTo(28, 26);
                ctx.lineTo(43, 26);
                ctx.lineTo(48, 42);
                ctx.stroke();

                // 4. Foreground: BIG BOLD BLUE DAY NUMBER
                // White aura behind number
                ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.beginPath();
                ctx.arc(32, 43, 14, 0, Math.PI * 2);
                ctx.fill();

                ctx.fillStyle = '#2563eb';
                ctx.font = '900 24px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(currentDay.toString(), 32, 44);

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
            viewBox="0 0 128 128" 
            className={className}
        >
            <defs>
                <!-- Card Drop Shadow -->
                <filter id="calShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor="#0f172a" floodOpacity="0.25"/>
                </filter>

                <!-- Top Header Gradient -->
                <linearGradient id="calHeaderGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#1d4ed8"/>
                    <stop offset="50%" stopColor="#2563eb"/>
                    <stop offset="100%" stopColor="#3b82f6"/>
                </linearGradient>

                <!-- Bike Silhouette Tint -->
                <linearGradient id="foilTint" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#60a5fa" stopOpacity="0.5"/>
                    <stop offset="100%" stopColor="#2563eb" stopOpacity="0.35"/>
                </linearGradient>
            </defs>

            <!-- 1. Calendar Card Base (Clean White Page) -->
            <g filter="url(#calShadow)">
                <rect x="8" y="8" width="112" height="112" rx="26" ry="26" fill="#ffffff" stroke="#e2e8f0" strokeWidth="1.5"/>

                <!-- Top Blue Header Bar -->
                <path d="M8 38 C8 21.43, 21.43 8, 38 8 L90 8 C106.57 8, 120 21.43, 120 38 L120 40 L8 40 Z" fill="url(#calHeaderGrad)"/>

                <!-- Top Hanging Binder Loops -->
                <rect x="32" y="3" width="7" height="11" rx="3.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2"/>
                <rect x="89" y="3" width="7" height="11" rx="3.5" fill="#f8fafc" stroke="#94a3b8" strokeWidth="1.2"/>
            </g>

            <!-- 2. Scott Foil RC Bike Silhouette in Background -->
            <g stroke="url(#foilTint)" strokeLinecap="round" strokeLinejoin="round" fill="none">
                <!-- 50mm Carbon Aero Wheels -->
                <circle cx="34" cy="80" r="17" strokeWidth="4"/>
                <circle cx="34" cy="80" r="12" strokeWidth="1.2"/>
                
                <circle cx="94" cy="80" r="17" strokeWidth="4"/>
                <circle cx="94" cy="80" r="12" strokeWidth="1.2"/>

                <!-- Scott Foil Frame lines -->
                <line x1="34" y1="80" x2="56" y2="80" strokeWidth="4"/>
                <line x1="34" y1="80" x2="50" y2="65" strokeWidth="3.5"/>
                <path d="M50 65 C51 70, 53 76, 56 80" strokeWidth="4.5"/>
                <line x1="50" y1="65" x2="52" y2="50" strokeWidth="4.5"/>
                
                <line x1="52" y1="50" x2="82" y2="50" strokeWidth="4.5"/>
                <line x1="56" y1="80" x2="82" y2="50" strokeWidth="5"/>
                <line x1="82" y1="50" x2="94" y2="80" strokeWidth="4.5"/>

                <!-- Cockpit & Seatpost -->
                <path d="M80 50 L84 43 L91 43 C93 43, 94 46, 93 48 L89 52" strokeWidth="3.5"/>
                <line x1="52" y1="50" x2="51" y2="43" strokeWidth="4"/>
                <path d="M43 42 C46 41, 54 41, 57 43 C55 45, 50 45, 45 44 Z" fill="#93c5fd" fillOpacity="0.4" strokeWidth="1"/>
            </g>

            <!-- 3. Foreground: HUGE BOLD BLUE DAY NUMBER (Google Calendar style) -->
            <!-- Soft White Halo Behind Number -->
            <circle cx="64" cy="81" r="26" fill="#ffffff" fillOpacity="0.88"/>

            <text 
                x="64" 
                y="95" 
                fontFamily="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif" 
                fontSize="46" 
                fontWeight="900" 
                fill="#2563eb" 
                textAnchor="middle" 
                letterSpacing="-2"
            >
                {today}
            </text>
        </svg>
    );
}
