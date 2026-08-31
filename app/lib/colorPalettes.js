// Brand colors only: semantic success, warning and error colors stay independent.
export const DEFAULT_PALETTE = 'forest';
export const SETTINGS_STORAGE_KEY = 'cycling-calendar-settings';
export const COLOR_PALETTES = [
    { id: 'forest', accent: '#176b57', soft: '#e5f1e9', nightAccent: '#bce881', nightSoft: '#293d2e', hero: '#153e35', highlight: '#d5f478', heroMuted: '#c6d8cb' },
    { id: 'atlantic', accent: '#245eb2', soft: '#e8effc', nightAccent: '#9fc5ff', nightSoft: '#203650', hero: '#183452', highlight: '#b2e4ff', heroMuted: '#c8d9ec' },
    { id: 'violet', accent: '#7144a5', soft: '#f0eafa', nightAccent: '#d2b4fa', nightSoft: '#382a49', hero: '#372448', highlight: '#e1c6ff', heroMuted: '#dfd1e9' },
    { id: 'terracotta', accent: '#a3472d', soft: '#faece5', nightAccent: '#ffbd9d', nightSoft: '#432e27', hero: '#492c24', highlight: '#ffd19f', heroMuted: '#ead3c7' },
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
            --site-hero: ${p.hero}; --site-lime: ${p.highlight}; --site-hero-muted: ${p.heroMuted};
        }
        :root.dark[data-palette="${p.id}"] {
            --site-accent: ${p.nightAccent}; --site-accent-soft: ${p.nightSoft};
        }
    `).join('');
}
// Apply before hydration. Untrusted storage supplies only a validated identifier.
export const paletteBootstrap = `(()=>{let p='${DEFAULT_PALETTE}';try{const v=JSON.parse(localStorage.getItem('${SETTINGS_STORAGE_KEY}'))?.state?.colorPalette;if(${JSON.stringify(COLOR_PALETTES.map(p => p.id))}.includes(v))p=v;}catch{}document.documentElement.dataset.palette=p;})();`;
