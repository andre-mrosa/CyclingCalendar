'use client';

import React from 'react';

export default function OrganizationLogo({ source, className = "h-4 w-auto object-contain" }) {
    if (source === 'Cabreira') {
        return (
            /* Cabreira logo has white text.
               In Dark Mode: white text on dark card -> no pill needed!
               In Light Mode: white text on white card -> subtle dark capsule */
            <div 
                className="flex items-center justify-center h-6 shrink-0 transition-all rounded-md bg-slate-900/85 dark:bg-transparent px-1.5 py-0.5 dark:p-0 border border-slate-800/60 dark:border-transparent" 
                title="Cabreira Solutions"
            >
                <img 
                    src="/logo-cabreira.png" 
                    alt="Cabreira Solutions" 
                    className={className} 
                    loading="lazy"
                />
            </div>
        );
    }

    /* FPC logo has black text.
       In Light Mode: black text on light card -> no pill needed!
       In Dark Mode: black text on dark card -> subtle soft light capsule */
    return (
        <div 
            className="flex items-center justify-center h-6 shrink-0 transition-all rounded-md bg-transparent dark:bg-slate-100/90 p-0 dark:px-1.5 dark:py-0.5 border-0" 
            title="Federação Portuguesa de Ciclismo"
        >
            <img 
                src="/logo-fpc.png" 
                alt="Federação Portuguesa de Ciclismo" 
                className={className} 
                loading="lazy"
            />
        </div>
    );
}
