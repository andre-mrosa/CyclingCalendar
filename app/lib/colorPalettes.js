// Brand colors only: semantic success, warning and error colors stay independent.
export const DEFAULT_PALETTE = 'forest';
export const SETTINGS_STORAGE_KEY = 'cycling-calendar-settings';
export const COLOR_PALETTES = [
    { id: 'forest', accent: '#b33f20', soft: '#f6dfd5', nightAccent: '#ff7448', nightSoft: '#4a291f' },
    { id: 'atlantic', accent: '#8f304c', soft: '#f4dfe6', nightAccent: '#e892ac', nightSoft: '#472a34' },
    { id: 'violet', accent: '#6d5296', soft: '#ece5f4', nightAccent: '#c0a8e3', nightSoft: '#352d43' },
    { id: 'terracotta', accent: '#84601d', soft: '#f3e8ce', nightAccent: '#e0b65d', nightSoft: '#413522' },
];
export function normalizePalette(value) {
    return COLOR_PALETTES.some(p => p.id === value) ? value : DEFAULT_PALETTE;
}
export function getPalette(value) {
    return COLOR_PALETTES.find(p => p.id === normalizePalette(value));
}
export function paletteCSS() {
    return COLOR_PALETTES.map(p => `
        :root[data-palette="${p.id}"] {
            --site-accent: ${p.accent}; --site-accent-soft: ${p.soft};
            --site-accent-strong: color-mix(in srgb, ${p.accent} 88%, #2b211c);
            --site-mark: ${p.nightAccent};
        }
        :root.dark[data-palette="${p.id}"] {
            --site-accent: ${p.nightAccent}; --site-accent-soft: ${p.nightSoft};
            --site-accent-strong: ${p.accent};
        }
    `).join('');
}
// Apply before hydration. Untrusted storage supplies only a validated identifier.
export const paletteBootstrap = `(()=>{let p='${DEFAULT_PALETTE}';try{const v=JSON.parse(localStorage.getItem('${SETTINGS_STORAGE_KEY}'))?.state?.colorPalette;if(${JSON.stringify(COLOR_PALETTES.map(p => p.id))}.includes(v))p=v;}catch{}document.documentElement.dataset.palette=p;})();`;
