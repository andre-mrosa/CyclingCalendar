import React from 'react';

/**
 * BrandLogo - Logótipo Oficial Cycling Calendar Portugal
 * Reprodução vetorial 1:1 rigorosa do logótipo da marca:
 * Calendário com ganchos + grelha e estrela da prova + estrada sinuosa + bicicleta de perfil.
 */
export default function BrandLogo({ 
  variant = 'icon', 
  size = 38, 
  className = '', 
  showText = false,
  textColor = 'text-white'
}) {
  const iconSvg = (
    <svg 
      viewBox="10 12 165 140" 
      className="w-full h-full" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <filter id="neonGlowBrand" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="0" stdDeviation="1.5" floodColor="#10b981" floodOpacity="0.45"/>
        </filter>
      </defs>

      <g stroke="#34d399" strokeLinecap="round" strokeLinejoin="round" filter="url(#neonGlowBrand)">
        {/* 1. Calendário */}
        <rect x="74" y="28" width="76" height="60" rx="7" strokeWidth="6" fill="none" />
        {/* Ganchos superiores do calendário (∩) */}
        <path d="M 92 28 V 18 C 92 15.5, 98 15.5, 98 18 V 28" strokeWidth="5" />
        <path d="M 130 28 V 18 C 130 15.5, 136 15.5, 136 18 V 28" strokeWidth="5" />
        {/* Linhas da grelha */}
        <line x1="74" y1="48" x2="150" y2="48" strokeWidth="4.5" />
        <line x1="74" y1="68" x2="150" y2="68" strokeWidth="4.5" />
        <line x1="93" y1="28" x2="93" y2="88" strokeWidth="4.5" />
        <line x1="112" y1="28" x2="112" y2="88" strokeWidth="4.5" />
        <line x1="131" y1="28" x2="131" y2="88" strokeWidth="4.5" />
        {/* Estrela da prova (linha 3, coluna 3) */}
        <polygon 
          points="121.5,72.5 123.3,76.5 127.6,76.8 124.3,79.8 125.3,84.1 121.5,81.8 117.7,84.1 118.7,79.8 115.4,76.8 119.7,76.5" 
          fill="#34d399" 
          stroke="none" 
        />

        {/* 2. Estrada Sinuosa */}
        <path d="M 106 88 C 102 91, 93 94, 88 99 C 81 106, 88 112, 98 115 C 105 117, 85 124, 60 125 C 46 125.5, 34 129, 28 133" strokeWidth="6" fill="none" />
        <path d="M 88 88 C 82 92, 74 97, 72 103 C 70 109, 78 116, 88 119 C 96 121.5, 78 129.5, 52 131 C 38 132, 24 137, 18 141" strokeWidth="6" fill="none" />

        {/* 3. Bicicleta de Corrida / Estrada */}
        <circle cx="118" cy="128" r="14" strokeWidth="5.5" fill="none" />
        <circle cx="162" cy="128" r="14" strokeWidth="5.5" fill="none" />
        <line x1="118" y1="128" x2="137" y2="128" strokeWidth="5" />
        <line x1="118" y1="128" x2="127" y2="104" strokeWidth="4.5" />
        <line x1="137" y1="128" x2="127" y2="104" strokeWidth="5" />
        <line x1="127" y1="104" x2="152" y2="104" strokeWidth="5" />
        <line x1="137" y1="128" x2="152" y2="110" strokeWidth="5" />
        <line x1="152" y1="104" x2="162" y2="128" strokeWidth="5" />
        <line x1="127" y1="104" x2="125" y2="98" strokeWidth="4.5" />
        <line x1="120" y1="98" x2="131" y2="98" strokeWidth="5" />
        <line x1="152" y1="104" x2="154" y2="97" strokeWidth="4.5" />
        <path d="M 152 97 H 159 C 162 97, 164 100, 162 105" strokeWidth="4.5" fill="none" />
      </g>
    </svg>
  );

  // Final clean mark: calendar structure + unmistakable bicycle silhouette.
  const finalIcon = (
    <img
      src="/brand-final.svg"
      alt=""
      aria-hidden="true"
      className="w-full h-full object-contain"
    />
  );

  if (variant === 'full') {
    return (
      <div className={`flex flex-col items-center text-center ${className}`}>
        <div style={{ width: size, height: size }} className="p-1">
          {finalIcon}
        </div>
        <div className="mt-1 font-black text-emerald-400 tracking-wider">
          <div className="text-sm leading-tight font-black">CYCLING</div>
          <div className="text-sm leading-tight font-black">CALENDAR</div>
          <div className="text-[10px] tracking-[0.2em] font-black text-emerald-300">PORTUGAL</div>
        </div>
      </div>
    );
  }

  // Header lockup variant (Icon badge + horizontal typography)
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div 
        style={{ width: size, height: size }} 
        className="rounded-xl bg-[#090e18] border border-emerald-500/30 flex items-center justify-center p-1 shrink-0 shadow-md shadow-emerald-500/10 transition-transform group-hover:scale-105"
      >
        {finalIcon}
      </div>

      {showText && (
        <div className="shrink-0">
          <div className={`font-black text-base tracking-tight ${textColor} flex items-center gap-1.5 leading-none`}>
            CYCLING<span className="text-emerald-400">CALENDAR</span>
            <span className="text-[9px] font-bold text-emerald-300 bg-emerald-950 border border-emerald-800/60 px-1.5 py-0.5 rounded leading-none">
              PT
            </span>
          </div>
          <p className="text-[11px] text-slate-400 hidden sm:block mt-0.5 font-sans">
            O calendário unificado de ciclismo em Portugal
          </p>
        </div>
      )}
    </div>
  );
}
