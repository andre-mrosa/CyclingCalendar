import { isMasterAdmin } from './auth-helpers';

/**
 * Extrai tipo de dispositivo a partir do User-Agent
 */
export function parseDevice(ua) {
    if (!ua) return 'Desktop';
    const s = ua.toLowerCase();
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(s)) {
        return 'Tablet';
    }
    if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/i.test(s)) {
        return 'Mobile';
    }
    return 'Desktop';
}

/**
 * Extrai o Navegador a partir do User-Agent
 */
export function parseBrowser(ua) {
    if (!ua) return 'Outro';
    const s = ua.toLowerCase();
    if (s.includes('edg/') || s.includes('edge/')) return 'Edge';
    if (s.includes('opr/') || s.includes('opera/')) return 'Opera';
    if (s.includes('chrome/') && !s.includes('chromium')) return 'Chrome';
    if (s.includes('safari/') && !s.includes('chrome')) return 'Safari';
    if (s.includes('firefox/')) return 'Firefox';
    if (s.includes('samsungbrowser')) return 'Samsung Internet';
    return 'Outro';
}

/**
 * Extrai o Sistema Operativo a partir do User-Agent
 */
export function parseOS(ua) {
    if (!ua) return 'Outro';
    const s = ua.toLowerCase();
    if (s.includes('iphone') || s.includes('ipad') || s.includes('ipod')) return 'iOS';
    if (s.includes('android')) return 'Android';
    if (s.includes('windows')) return 'Windows';
    if (s.includes('macintosh') || s.includes('mac os x')) return 'macOS';
    if (s.includes('linux')) return 'Linux';
    return 'Outro';
}

/**
 * Extrai geolocalização e metadados de cabeçalhos HTTP
 */
export function extractGeoAndDevice(headersList) {
    const ua = headersList.get('user-agent') || '';
    const rawCountry = headersList.get('x-vercel-ip-country') || headersList.get('cf-ipcountry') || 'Desconhecido';
    const rawCity = headersList.get('x-vercel-ip-city') || 'Desconhecido';
    const rawRegion = headersList.get('x-vercel-ip-country-region') || null;

    let city = rawCity;
    try {
        if (city && city !== 'Desconhecido') {
            city = decodeURIComponent(city);
        }
    } catch {}

    const device = parseDevice(ua);
    const browser = parseBrowser(ua);
    const os = parseOS(ua);

    return {
        country: rawCountry,
        city: city || 'Desconhecido',
        region: rawRegion,
        device,
        browser,
        os
    };
}

/**
 * Formata segundos em texto amigável (ex: "3m 42s", "45s", "1h 12m")
 */
export function formatDuration(seconds) {
    if (!seconds || seconds <= 0) return '0s';
    const s = Math.round(seconds);
    if (s < 60) return `${s}s`;
    const minutes = Math.floor(s / 60);
    const remSeconds = s % 60;
    if (minutes < 60) {
        return remSeconds > 0 ? `${minutes}m ${remSeconds}s` : `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const remMinutes = minutes % 60;
    return remMinutes > 0 ? `${hours}h ${remMinutes}m` : `${hours}h`;
}
