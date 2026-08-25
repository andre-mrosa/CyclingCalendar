'use client';

import React, { useState, useEffect } from 'react';

export default function DynamicLogo({ className = "w-8 h-8", dayNumber }) {
    const [today, setToday] = useState(dayNumber || new Date().getDate());

    useEffect(() => {
        const currentDay = new Date().getDate();
        setToday(currentDay);

        // Update favicon dynamically in real-time
        try {
            const canvas = document.createElement('canvas');
            canvas.width = 64;
            canvas.height = 64;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                // Background squircle
                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.roundRect(0, 0, 64, 64, 14);
                ctx.fill();

                // Bicycle outline in white
                ctx.strokeStyle = '#ffffff';
                ctx.lineWidth = 3;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                // Wheels
                ctx.beginPath();
                ctx.arc(18, 32, 10, 0, Math.PI * 2);
                ctx.stroke();

                ctx.beginPath();
                ctx.arc(46, 32, 10, 0, Math.PI * 2);
                ctx.stroke();

                // Frame
                ctx.beginPath();
                ctx.moveTo(18, 32);
                ctx.lineTo(28, 17);
                ctx.lineTo(41, 17);
                ctx.lineTo(46, 32);
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(28, 17);
                ctx.lineTo(32, 32);
                ctx.lineTo(18, 32);
                ctx.stroke();

                // Calendar Badge in Center
                ctx.fillStyle = '#ffffff';
                ctx.beginPath();
                ctx.roundRect(23, 27, 20, 20, 4);
                ctx.fill();

                // Calendar top bar
                ctx.fillStyle = '#1d4ed8';
                ctx.beginPath();
                ctx.roundRect(23, 27, 20, 5, [4, 4, 0, 0]);
                ctx.fill();

                // Day text
                ctx.fillStyle = '#0f172a';
                ctx.font = '900 10px system-ui, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(currentDay.toString(), 33, 39);

                // Update link tag
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
                <linearGradient id="logoBgGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="#3b82f6"/>
                    <stop offset="100%" stopColor="#1d4ed8"/>
                </linearGradient>
                <filter id="logoShadow" x="-10%" y="-10%" width="120%" height="120%">
                    <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#000000" floodOpacity="0.25"/>
                </filter>
            </defs>

            {/* Squircle Base with Royal Blue Gradient */}
            <rect width="120" height="120" rx="28" ry="28" fill="url(#logoBgGrad)"/>

            {/* Bicycle Silhouette in Crisp Pure White */}
            <g stroke="#ffffff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#logoShadow)">
                {/* Wheels */}
                <circle cx="34" cy="58" r="19"/>
                <circle cx="86" cy="58" r="19"/>

                {/* Frame */}
                <line x1="34" y1="58" x2="52" y2="30"/>
                <line x1="52" y1="30" x2="76" y2="30"/>
                <line x1="76" y1="30" x2="86" y2="58"/>
                <line x1="52" y1="30" x2="60" y2="58"/>
                <line x1="34" y1="58" x2="60" y2="58"/>
                <line x1="60" y1="58" x2="76" y2="30"/>

                {/* Seat & Handlebars */}
                <line x1="52" y1="30" x2="48" y2="22"/>
                <line x1="42" y1="22" x2="56" y2="22"/>
                <line x1="76" y1="30" x2="79" y2="21"/>
                <line x1="74" y1="21" x2="84" y2="21"/>
                <path d="M84 21 Q88 24 85 28"/>
            </g>

            {/* Central Calendar Badge with Today's Date */}
            <g filter="url(#logoShadow)">
                {/* Calendar Card Base */}
                <rect x="42" y="52" width="36" height="36" rx="8" ry="8" fill="#ffffff"/>
                
                {/* Top Binding Loops */}
                <rect x="49" y="47" width="4.5" height="8" rx="2" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5"/>
                <rect x="66.5" y="47" width="4.5" height="8" rx="2" fill="#ffffff" stroke="#1d4ed8" strokeWidth="1.5"/>

                {/* Top Header Stripe */}
                <path d="M42 61 Q42 52 50 52 L70 52 Q78 52 78 61 Z" fill="#2563eb"/>

                {/* Dynamic Day Number */}
                <text 
                    x="60" 
                    y="81" 
                    fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" 
                    fontSize="17" 
                    fontWeight="900" 
                    fill="#0f172a" 
                    textAnchor="middle" 
                    letterSpacing="-0.5"
                >
                    {today}
                </text>
            </g>
        </svg>
    );
}
