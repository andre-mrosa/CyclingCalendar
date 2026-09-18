// Brand colors only: semantic success, warning and error colors stay independent.
export const DEFAULT_PALETTE = 'forest';
export const SETTINGS_STORAGE_KEY = 'cycling-calendar-settings';
export const COLOR_PALETTES = [
    { id: 'forest', accent: '#35634e', soft: '#edf3ee', nightAccent: '#a8ceb8', nightSoft: '#293b30' },
    { id: 'atlantic', accent: '#454952', soft: '#edeef0', nightAccent: '#bfc5cf', nightSoft: '#2c3039' },
    { id: 'violet', accent: '#6d5296', soft: '#ece5f4', nightAccent: '#c0a8e3', nightSoft: '#352d43' },
    { id: 'terracotta', accent: '#a54c35', soft: '#f5e8df', nightAccent: '#eab79e', nightSoft: '#443128' },
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
            --site-accent-strong: color-mix(in srgb, ${p.accent} 88%, #111827);
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
