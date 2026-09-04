'use client';

import React, { useState, useRef, useMemo } from 'react';
import { Mountain, ArrowUpRight, Download, Navigation } from 'lucide-react';

export default function ElevationProfileChart({ gpxData, gpxUrl, title }) {
    const [hoverIndex, setHoverIndex] = useState(null);
    const svgRef = useRef(null);

    const profile = gpxData?.profile || [];
    const totalKm = gpxData?.totalKm || 0;
    const minAlt = gpxData?.minAltitude || 0;
    const maxAlt = gpxData?.maxAltitude || 100;
    const gain = gpxData?.elevationGain || 0;

    // Dimensões do viewBox SVG
    const width = 1000;
    const height = 300;
    const padding = { top: 30, right: 20, bottom: 40, left: 55 };

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Amplitude de altitude com folga visual
    const altSpan = Math.max(maxAlt - minAlt, 40);
    const yMin = Math.max(0, Math.floor((minAlt - altSpan * 0.1) / 10) * 10);
    const yMax = Math.ceil((maxAlt + altSpan * 0.1) / 10) * 10;
    const yRange = yMax - yMin || 1;

    // Mapeamento de coordenadas (X, Y)
    const points = useMemo(() => {
        if (!profile.length || !totalKm) return [];
        return profile.map(p => {
            const x = padding.left + (p.distKm / totalKm) * chartWidth;
            const y = padding.top + chartHeight - ((p.ele - yMin) / yRange) * chartHeight;
            return { x, y, distKm: p.distKm, ele: p.ele };
        });
    }, [profile, totalKm, yMin, yRange, chartWidth, chartHeight, padding.left, padding.top]);

    // Linha de contorno e polígono de preenchimento
    const { linePath, areaPath } = useMemo(() => {
        if (!points.length) return { linePath: '', areaPath: '' };

        const pathCoords = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
        const bottomY = padding.top + chartHeight;
        const areaCoords = `${pathCoords} L ${points[points.length - 1].x.toFixed(1)} ${bottomY} L ${points[0].x.toFixed(1)} ${bottomY} Z`;

        return { linePath: pathCoords, areaPath: areaCoords };
    }, [points, padding.top, chartHeight]);

    // Rastreio de cursor
    const handleMouseMove = (e) => {
        if (!svgRef.current || !points.length) return;
        const rect = svgRef.current.getBoundingClientRect();
        const clientX = e.clientX - rect.left;
        const svgX = (clientX / rect.width) * width;

        // Encontrar o ponto mais próximo
        let closestIdx = 0;
        let minDiff = Infinity;
        for (let i = 0; i < points.length; i++) {
            const diff = Math.abs(points[i].x - svgX);
            if (diff < minDiff) {
                minDiff = diff;
                closestIdx = i;
            }
        }
        setHoverIndex(closestIdx);
    };

    const handleMouseLeave = () => {
        setHoverIndex(null);
    };

    const activePoint = hoverIndex !== null && points[hoverIndex] ? points[hoverIndex] : null;

    // Estimativa de inclinação no ponto hovered
    const activeGrade = useMemo(() => {
        if (hoverIndex === null || hoverIndex < 1 || hoverIndex >= points.length) return null;
        const p1 = points[hoverIndex - 1];
        const p2 = points[hoverIndex];
        const dDistMeters = (p2.distKm - p1.distKm) * 1000;
        const dEleMeters = p2.ele - p1.ele;
        if (dDistMeters <= 5) return null;
        const grade = (dEleMeters / dDistMeters) * 100;
        return Math.min(Math.max(Math.round(grade * 10) / 10, -25), 25);
    }, [hoverIndex, points]);

    // Eixos de referência de altitude (Y)
    const yTicks = [
        { val: yMin, y: padding.top + chartHeight },
        { val: Math.round(yMin + yRange * 0.5), y: padding.top + chartHeight * 0.5 },
        { val: yMax, y: padding.top }
    ];

    // Eixos de referência de distância (X)
    const xTicks = [
        { val: '0 km', x: padding.left },
        { val: `${Math.round(totalKm * 0.25)} km`, x: padding.left + chartWidth * 0.25 },
        { val: `${Math.round(totalKm * 0.5)} km`, x: padding.left + chartWidth * 0.5 },
        { val: `${Math.round(totalKm * 0.75)} km`, x: padding.left + chartWidth * 0.75 },
        { val: `${totalKm} km`, x: padding.left + chartWidth }
    ];

    return (
        <div className="bg-slate-900/80 border border-slate-800/80 rounded-3xl p-5 sm:p-7 space-y-5">
            {/* Header com métricas oficiais */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                            Track GPX Oficial
                        </span>
                        <span className="text-xs text-slate-400 font-mono">
                            {gpxData?.pointsCount || 0} coordenadas analisadas
                        </span>
                    </div>
                    <h3 className="text-lg font-bold text-white mt-1">
                        Perfil Altimétrico Interativo {title ? `• ${title}` : ''}
                    </h3>
                </div>

                {gpxUrl && (
                    <a
                        href={`/api/download-track?url=${encodeURIComponent(gpxUrl)}&title=${encodeURIComponent(title || 'track')}`}
                        download={`${(title || 'track').toLowerCase().replace(/[^a-z0-9]/g, '_')}.gpx`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-colors shadow-md shrink-0 w-fit cursor-pointer"
                    >
                        <Download size={14} />
                        <span>Baixar Ficheiro GPX</span>
                    </a>
                )}
            </div>

            {/* Metric Strips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Distância</span>
                    <strong className="block text-base sm:text-lg font-black text-white mt-0.5">{totalKm} km</strong>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Acumulado (D+)</span>
                    <strong className="block text-base sm:text-lg font-black text-emerald-400 mt-0.5">+{gain} m</strong>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Altitude Máx.</span>
                    <strong className="block text-base sm:text-lg font-black text-white mt-0.5">{maxAlt} m</strong>
                </div>
                <div className="bg-slate-950/70 p-3.5 rounded-2xl border border-slate-800/80">
                    <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-wider">Altitude Mín.</span>
                    <strong className="block text-base sm:text-lg font-black text-slate-300 mt-0.5">{minAlt} m</strong>
                </div>
            </div>

            {/* Interactive SVG Chart Container */}
            <div className="relative bg-slate-950/90 rounded-2xl border border-slate-800 p-2 sm:p-4 overflow-hidden select-none">
                {/* Active Hover Stats Banner */}
                {activePoint && (
                    <div className="absolute top-4 right-4 z-20 bg-slate-900/95 backdrop-blur-md border border-emerald-500/40 px-3.5 py-1.5 rounded-xl shadow-lg flex items-center gap-3 text-xs font-mono">
                        <div>
                            <span className="text-slate-400 text-[10px] block">Posição</span>
                            <span className="font-bold text-white">{activePoint.distKm} km</span>
                        </div>
                        <div className="w-px h-5 bg-slate-700"></div>
                        <div>
                            <span className="text-slate-400 text-[10px] block">Altitude</span>
                            <span className="font-bold text-emerald-400">{activePoint.ele} m</span>
                        </div>
                        {activeGrade !== null && (
                            <>
                                <div className="w-px h-5 bg-slate-700"></div>
                                <div>
                                    <span className="text-slate-400 text-[10px] block">Inclinação</span>
                                    <span className={`font-bold ${activeGrade > 0 ? 'text-amber-400' : 'text-sky-400'}`}>
                                        {activeGrade > 0 ? `+${activeGrade}%` : `${activeGrade}%`}
                                    </span>
                                </div>
                            </>
                        )}
                    </div>
                )}

                <svg
                    ref={svgRef}
                    viewBox={`0 0 ${width} ${height}`}
                    className="w-full h-56 sm:h-72 cursor-crosshair overflow-visible"
                    onMouseMove={handleMouseMove}
                    onMouseLeave={handleMouseLeave}
                    onTouchMove={(e) => {
                        if (e.touches[0]) handleMouseMove(e.touches[0]);
                    }}
                    onTouchEnd={handleMouseLeave}
                >
                    <defs>
                        <linearGradient id="elevationAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#10b981" stopOpacity="0.35" />
                            <stop offset="60%" stopColor="#059669" stopOpacity="0.1" />
                            <stop offset="100%" stopColor="#020617" stopOpacity="0.0" />
                        </linearGradient>
                        <filter id="emeraldGlow" x="-20%" y="-20%" width="140%" height="140%">
                            <feDropShadow dx="0" dy="0" stdDeviation="3" floodColor="#10b981" floodOpacity="0.6" />
                        </filter>
                    </defs>

                    {/* Linhas de Grelha Horizontais (Y) */}
                    {yTicks.map((tick, i) => (
                        <g key={i}>
                            <line
                                x1={padding.left}
                                y1={tick.y}
                                x2={width - padding.right}
                                y2={tick.y}
                                stroke="#1e293b"
                                strokeDasharray={i === 0 ? 'none' : '4 4'}
                                strokeWidth="1"
                            />
                            <text
                                x={padding.left - 8}
                                y={tick.y + 3}
                                textAnchor="end"
                                className="fill-slate-500 text-[11px] font-mono select-none"
                            >
                                {tick.val}m
                            </text>
                        </g>
                    ))}

                    {/* Área Preenchida com Gradiente */}
                    {areaPath && <path d={areaPath} fill="url(#elevationAreaGrad)" />}

                    {/* Linha de Perfil Altimétrico */}
                    {linePath && (
                        <path
                            d={linePath}
                            fill="none"
                            stroke="#10b981"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            filter="url(#emeraldGlow)"
                        />
                    )}

                    {/* Linha Vertical e Marcador no Ponto Ativo (Hover) */}
                    {activePoint && (
                        <g>
                            <line
                                x1={activePoint.x}
                                y1={padding.top}
                                x2={activePoint.x}
                                y2={padding.top + chartHeight}
                                stroke="#38bdf8"
                                strokeWidth="1.5"
                                strokeDasharray="3 3"
                            />
                            <circle
                                cx={activePoint.x}
                                cy={activePoint.y}
                                r="5.5"
                                fill="#020617"
                                stroke="#10b981"
                                strokeWidth="3"
                            />
                            <circle
                                cx={activePoint.x}
                                cy={activePoint.y}
                                r="2"
                                fill="#38bdf8"
                            />
                        </g>
                    )}

                    {/* Eixo de Distância X (Linha inferior e Ticks) */}
                    <line
                        x1={padding.left}
                        y1={padding.top + chartHeight}
                        x2={width - padding.right}
                        y2={padding.top + chartHeight}
                        stroke="#334155"
                        strokeWidth="1.5"
                    />

                    {xTicks.map((tick, i) => (
                        <text
                            key={i}
                            x={tick.x}
                            y={padding.top + chartHeight + 20}
                            textAnchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
                            className="fill-slate-400 text-[11px] font-mono select-none"
                        >
                            {tick.val}
                        </text>
                    ))}
                </svg>

                <div className="text-center text-[11px] text-slate-400 font-mono pt-1">
                    Passa o cursor ou desliza o dedo pelo gráfico para inspecionar cada quilómetro e altitude do percurso
                </div>
            </div>
        </div>
    );
}
