'use client';

import React from 'react';

export default function OrganizationLogo({ source, className = "h-4.5 w-auto object-contain" }) {
    if (source === 'Cabreira') {
        return (
            <div className="flex items-center justify-center shrink-0" title="Cabreira Solutions">
                <img 
                    src="/logo-cabreira.png" 
                    alt="Cabreira Solutions" 
                    className={`${className} drop-shadow-[0_0_1px_rgba(0,0,0,0.85)] dark:drop-shadow-none transition-all`} 
                    loading="lazy"
                />
            </div>
        );
    }

    // FPC and default
    return (
        <div className="flex items-center justify-center shrink-0" title="Federação Portuguesa de Ciclismo">
            <img 
                src="/logo-fpc.png" 
                alt="Federação Portuguesa de Ciclismo" 
                className={`${className} drop-shadow-none dark:drop-shadow-[0_0_1px_rgba(255,255,255,0.8)] transition-all`} 
                loading="lazy"
            />
        </div>
    );
}
