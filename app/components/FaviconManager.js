'use client';

import { useEffect } from 'react';

export default function FaviconManager() {
    useEffect(() => {
        const updateFavicon = () => {
            try {
                const currentDay = new Date().getDate();
                const canvas = document.createElement('canvas');
                canvas.width = 64;
                canvas.height = 64;
                const ctx = canvas.getContext('2d');
                if (!ctx) return;

                // 1. Solid Royal Blue Squircle Base
                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.roundRect(0, 0, 64, 64, 15);
                ctx.fill();

                // 2. Scott Foil RC Bike Silhouette (Dark Midnight Slate)
                ctx.strokeStyle = '#091833';
                ctx.lineWidth = 3.5;
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

                // Cockpit
                ctx.beginPath();
                ctx.moveTo(43, 16);
                ctx.lineTo(47, 12);
                ctx.lineTo(49, 16);
                ctx.stroke();

                // 3. Foreground: HUGE PURE WHITE BOLD DAY NUMBER
                ctx.shadowColor = 'rgba(5, 19, 41, 0.9)';
                ctx.shadowBlur = 4;
                ctx.shadowOffsetX = 0;
                ctx.shadowOffsetY = 2;

                ctx.fillStyle = '#ffffff';
                ctx.font = '900 38px system-ui, -apple-system, sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(currentDay.toString(), 32, 34);

                // Update ALL favicon link elements in document head
                const dataUrl = canvas.toDataURL('image/png');
                const existingIcons = document.querySelectorAll("link[rel*='icon'], link[rel*='shortcut']");
                
                if (existingIcons.length > 0) {
                    existingIcons.forEach(el => {
                        el.href = dataUrl;
                        el.type = 'image/png';
                    });
                } else {
                    const newLink = document.createElement('link');
                    newLink.rel = 'icon';
                    newLink.type = 'image/png';
                    newLink.href = dataUrl;
                    document.head.appendChild(newLink);
                }
            } catch (e) {
                // Silently fallback if canvas is not supported
            }
        };

        updateFavicon();

        // Check every minute for day rollover (at midnight)
        const interval = setInterval(updateFavicon, 60000);
        return () => clearInterval(interval);
    }, []);

    return null;
}
