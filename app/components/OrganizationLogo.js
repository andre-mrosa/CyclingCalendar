'use client';

import React from 'react';

export default function OrganizationLogo({ source, className = "h-5 w-auto object-contain" }) {
    if (!source) return null;

    const sources = source.split(',').map(s => s.trim()).filter(Boolean);

    const renderSingleLogo = (srcName, key) => {
        if (srcName === 'Cabreira') {
            return (
                <div 
                    key={key}
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

        if (srcName === 'StopAndGo' || srcName === 'Stop and Go') {
            return (
                <div 
                    key={key}
                    className="flex items-center justify-center shrink-0 px-2 py-0.5 rounded-md bg-blue-600/10 dark:bg-blue-500/15 border border-blue-500/30 text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider" 
                    title="Stop and Go"
                >
                    Stop&Go
                </div>
            );
        }

        // FPC and default
        return (
            <div 
                key={key}
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
    };

    if (sources.length === 1) {
        return renderSingleLogo(sources[0], 'single-logo');
    }

    return (
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {sources.map((s, idx) => renderSingleLogo(s, `multi-logo-${idx}`))}
        </div>
    );
}
