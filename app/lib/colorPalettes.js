// Brand colors only: semantic success, warning and error colors stay independent.
export const DEFAULT_PALETTE = 'forest';
export const SETTINGS_STORAGE_KEY = 'cycling-calendar-settings';
export const COLOR_PALETTES = [
    { id: 'forest', accent: '#166534', soft: '#dcfce7', nightAccent: '#22c55e', nightSoft: '#143526' },
    { id: 'atlantic', accent: '#ad351c', soft: '#f7ded5', nightAccent: '#f07856', nightSoft: '#45261f' },
    { id: 'violet', accent: '#6552a8', soft: '#ece8f7', nightAccent: '#b5a7e7', nightSoft: '#302a47' },
    { id: 'terracotta', accent: '#7b5945', soft: '#eee6df', nightAccent: '#caa58f', nightSoft: '#392d27' },
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
            --site-accent-strong: color-mix(in srgb, ${p.accent} 88%, #091426);
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
