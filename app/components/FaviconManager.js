'use client';

import { useEffect } from 'react';

export default function FaviconManager() {
    useEffect(() => {
        try {
            const existingIcons = document.querySelectorAll("link[rel*='icon'], link[rel*='shortcut']");
            if (existingIcons.length > 0) {
                existingIcons.forEach(el => {
                    el.href = '/logo.jpg';
                    el.type = 'image/jpeg';
                });
            } else {
                const newLink = document.createElement('link');
                newLink.rel = 'icon';
                newLink.type = 'image/jpeg';
                newLink.href = '/logo.jpg';
                document.head.appendChild(newLink);
            }
        } catch (e) {}
    }, []);

    return null;
}
