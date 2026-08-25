'use client';

import React from 'react';
import { useTheme } from 'next-themes';

export default function OrganizationLogo({ source, className = "h-5 object-contain" }) {
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === 'dark';

    if (source === 'Cabreira') {
        const src = isDark ? '/logo-cabreira.png' : '/logo-cabreira-dark.png';
        return (
            <img 
                src={src} 
                alt="Cabreira Solutions" 
                className={`${className} transition-opacity duration-200`} 
                loading="lazy"
            />
        );
    }

    // Default to FPC
    const src = isDark ? '/logo-fpc-white.png' : '/logo-fpc.png';
    return (
        <img 
            src={src} 
            alt="Federação Portuguesa de Ciclismo" 
            className={`${className} transition-opacity duration-200`} 
            loading="lazy"
        />
    );
}
