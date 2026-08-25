'use client';

import React from 'react';

export default function OrganizationLogo({ source, className = "h-5 w-auto object-contain" }) {
    if (source === 'Cabreira') {
        return (
            <div 
                className="flex items-center justify-center shrink-0 relative px-1 py-0.5 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(15,23,42,0.35)_0%,rgba(15,23,42,0)_75%)] dark:bg-transparent" 
                title="Cabreira Solutions"
            >
                <img 
                    src="/logo-cabreira.png" 
                    alt="Cabreira Solutions" 
                    className={`${className} drop-shadow-[0_0_2px_rgba(0,0,0,0.85)] drop-shadow-[0_0_6px_rgba(0,0,0,0.35)] dark:drop-shadow-none transition-all`} 
                    loading="lazy"
                />
            </div>
        );
    }

    // FPC and default
    return (
        <div 
            className="flex items-center justify-center shrink-0 relative px-1 py-0.5 rounded-full bg-transparent dark:bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.22)_0%,rgba(255,255,255,0)_75%)]" 
            title="Federação Portuguesa de Ciclismo"
        >
            <img 
                src="/logo-fpc.png" 
                alt="Federação Portuguesa de Ciclismo" 
                className={`${className} drop-shadow-none dark:drop-shadow-[0_0_2px_rgba(255,255,255,0.9)] dark:drop-shadow-[0_0_8px_rgba(255,255,255,0.45)] transition-all`} 
                loading="lazy"
            />
        </div>
    );
}
