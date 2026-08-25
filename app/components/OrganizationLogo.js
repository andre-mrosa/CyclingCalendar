'use client';

import React from 'react';

export default function OrganizationLogo({ source, className = "h-5 w-auto object-contain" }) {
    if (source === 'Cabreira') {
        return (
            <div className="flex items-center justify-center shrink-0" title="Cabreira Solutions">
                {/* Light mode: dark text */}
                <img 
                    src="/logo-cabreira-dark.png" 
                    alt="Cabreira Solutions" 
                    className={`${className} block dark:hidden`} 
                    loading="lazy"
                />
                {/* Dark mode: white text */}
                <img 
                    src="/logo-cabreira.png" 
                    alt="Cabreira Solutions" 
                    className={`${className} hidden dark:block`} 
                    loading="lazy"
                />
            </div>
        );
    }

    // FPC and default
    return (
        <div className="flex items-center justify-center shrink-0" title="Federação Portuguesa de Ciclismo">
            {/* Light mode: black text */}
            <img 
                src="/logo-fpc.png" 
                alt="Federação Portuguesa de Ciclismo" 
                className={`${className} block dark:hidden`} 
                loading="lazy"
            />
            {/* Dark mode: white text */}
            <img 
                src="/logo-fpc-white.png" 
                alt="Federação Portuguesa de Ciclismo" 
                className={`${className} hidden dark:block`} 
                loading="lazy"
            />
        </div>
    );
}
