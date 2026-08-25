'use client';

import React from 'react';

export default function OrganizationLogo({ source, className = "h-3.5 w-auto object-contain" }) {
    if (source === 'Cabreira') {
        return (
            <div className="bg-slate-800/40 border border-slate-700/50 px-1.5 py-0.5 rounded-md flex items-center justify-center h-5 shrink-0 transition-all hover:bg-slate-800/60" title="Cabreira Solutions">
                <img 
                    src="/logo-cabreira.png" 
                    alt="Cabreira Solutions" 
                    className={className} 
                    loading="lazy"
                />
            </div>
        );
    }

    // FPC and default: Official original untouched logo inside subtle soft reserve area badge
    return (
        <div className="bg-white/85 border border-white/30 px-1.5 py-0.5 rounded-md flex items-center justify-center h-5 shrink-0 transition-all hover:bg-white/95 shadow-[0_1px_3px_rgba(0,0,0,0.2)]" title="Federação Portuguesa de Ciclismo">
            <img 
                src="/logo-fpc.png" 
                alt="Federação Portuguesa de Ciclismo" 
                className={className} 
                loading="lazy"
            />
        </div>
    );
}
