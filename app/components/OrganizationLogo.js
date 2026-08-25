'use client';

import React from 'react';

export default function OrganizationLogo({ source, className = "h-4 w-auto object-contain" }) {
    if (source === 'Cabreira') {
        return (
            <div className="bg-slate-900/90 border border-slate-800 px-2 py-0.5 rounded-md flex items-center justify-center h-6 shrink-0 shadow-sm" title="Cabreira Solutions">
                <img 
                    src="/logo-cabreira.png" 
                    alt="Cabreira Solutions" 
                    className={className} 
                    loading="lazy"
                />
            </div>
        );
    }

    // FPC and default: Official original untouched logo inside clean white reserve area badge
    return (
        <div className="bg-white px-2 py-0.5 rounded-md flex items-center justify-center h-6 shrink-0 shadow-sm" title="Federação Portuguesa de Ciclismo">
            <img 
                src="/logo-fpc.png" 
                alt="Federação Portuguesa de Ciclismo" 
                className={className} 
                loading="lazy"
            />
        </div>
    );
}
