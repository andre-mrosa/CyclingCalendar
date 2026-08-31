// Brand colors only: semantic success, warning and error colors stay independent.
export const DEFAULT_PALETTE = 'atlantic';
export const SETTINGS_STORAGE_KEY = 'cycling-calendar-settings';
export const COLOR_PALETTES = [
    { id: 'forest', accent: '#26705d', soft: '#edf5f1', nightAccent: '#81baa5', nightSoft: '#192e2b' },
    { id: 'atlantic', accent: '#126879', soft: '#e8f2f5', nightAccent: '#8ac9d4', nightSoft: '#142c37' },
    { id: 'violet', accent: '#7144a5', soft: '#f2eef7', nightAccent: '#bfacd8', nightSoft: '#28253a' },
    { id: 'terracotta', accent: '#a3472d', soft: '#f7eeea', nightAccent: '#d7ac94', nightSoft: '#302724' },
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
            --site-mark: ${p.nightAccent};
        }
        :root.dark[data-palette="${p.id}"] {
            --site-accent: ${p.nightAccent}; --site-accent-soft: ${p.nightSoft};
        }
    `).join('');
}
// Apply before hydration. Untrusted storage supplies only a validated identifier.
export const paletteBootstrap = `(()=>{let p='${DEFAULT_PALETTE}';try{const v=JSON.parse(localStorage.getItem('${SETTINGS_STORAGE_KEY}'))?.state?.colorPalette;if(${JSON.stringify(COLOR_PALETTES.map(p => p.id))}.includes(v))p=v;}catch{}document.documentElement.dataset.palette=p;})();`;
