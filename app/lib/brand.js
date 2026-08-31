// Shared geometry for the responsive mark and generated install/browser icons.
export const CALENDAR_PATH = 'M14 32V23a6 6 0 0 1 6-6h24a6 6 0 0 1 6 6v9M22 13v8m20-8v8M14 28h36';
export const BICYCLE_PATH = 'm22 44 9-14 7 14H22m16 0 6-14h-6m6 0 3 14M28 30h6';
export function brandSVG() {
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" width="64" height="64"><rect width="64" height="64" rx="16" fill="#152a3e"/><g fill="none" stroke-linecap="round" stroke-linejoin="round"><path d="${CALENDAR_PATH}" stroke="#e7eef4" stroke-width="3"/><g stroke="#8ac9d4" stroke-width="2.8"><circle cx="22" cy="44" r="8"/><circle cx="47" cy="44" r="8"/><path d="${BICYCLE_PATH}"/></g></g></svg>`;
}
