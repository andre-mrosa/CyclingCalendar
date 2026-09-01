// Brand colors only: semantic success, warning and error colors stay independent.
export const DEFAULT_PALETTE = 'atlantic';
export const SETTINGS_STORAGE_KEY = 'cycling-calendar-settings';
export const COLOR_PALETTES = [
    { id: 'forest', accent: '#24715f', soft: '#edf6f2', nightAccent: '#78c4aa', nightSoft: '#17322c' },
    { id: 'atlantic', accent: '#3657d6', soft: '#edf0ff', nightAccent: '#8fa8ff', nightSoft: '#1c2748' },
    { id: 'violet', accent: '#7350c7', soft: '#f2effb', nightAccent: '#bca8f2', nightSoft: '#2a2444' },
    { id: 'terracotta', accent: '#ad512f', soft: '#f9efeb', nightAccent: '#e1a48b', nightSoft: '#38251f' },
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
