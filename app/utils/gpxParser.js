/**
 * Utility para processamento de ficheiros GPX e cálculo de métricas de percurso
 * (Distância total, Elevação acumulada D+, Altitude Min/Max e Perfil Altimétrico)
 */

function toRad(deg) {
    return (deg * Math.PI) / 180;
}

/**
 * Distância de Haversine em quilómetros entre dois pontos geográficos
 */
export function haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Raio da Terra em km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

/**
 * Faz o parsing de um texto XML GPX e calcula o perfil altimétrico
 * @param {string} gpxText Conteúdo do ficheiro .gpx
 * @param {number} targetPoints Número aproximado de pontos para o perfil gráfico (default 250)
 */
export function parseGpxElevation(gpxText, targetPoints = 250) {
    if (!gpxText || typeof gpxText !== 'string') return null;

    // Extração regex rápida e compatível com Node.js e browser (sem depender de DOMParser)
    const trkptRegex = /<trkpt\s+lat=["']([^"']+)["']\s+lon=["']([^"']+)["'][^>]*>([\s\S]*?)<\/trkpt>/gi;
    const eleRegex = /<ele>([^<]+)<\/ele>/i;

    const rawPoints = [];
    let match;

    while ((match = trkptRegex.exec(gpxText)) !== null) {
        const lat = parseFloat(match[1]);
        const lon = parseFloat(match[2]);
        const inner = match[3];
        const eleMatch = eleRegex.exec(inner);
        const ele = eleMatch ? parseFloat(eleMatch[1]) : 0;

        if (!isNaN(lat) && !isNaN(lon)) {
            rawPoints.push({ lat, lon, ele: isNaN(ele) ? 0 : ele });
        }
    }

    if (rawPoints.length < 2) return null;

    let totalDistKm = 0;
    let elevationGain = 0;
    let elevationLoss = 0;
    let minEle = rawPoints[0].ele;
    let maxEle = rawPoints[0].ele;

    const cumulativePoints = [{ distKm: 0, ele: rawPoints[0].ele }];

    for (let i = 1; i < rawPoints.length; i++) {
        const prev = rawPoints[i - 1];
        const curr = rawPoints[i];

        const d = haversineDistance(prev.lat, prev.lon, curr.lat, curr.lon);
        totalDistKm += d;

        const diffEle = curr.ele - prev.ele;
        // Filtro de jitter para evitar ruído de sensor barométrico (< 0.2m)
        if (diffEle > 0.2) {
            elevationGain += diffEle;
        } else if (diffEle < -0.2) {
            elevationLoss += Math.abs(diffEle);
        }

        if (curr.ele < minEle) minEle = curr.ele;
        if (curr.ele > maxEle) maxEle = curr.ele;

        cumulativePoints.push({
            distKm: Math.round(totalDistKm * 100) / 100,
            ele: Math.round(curr.ele)
        });
    }

    // Downsampling inteligente para renderização fluida no gráfico
    let sampledPoints = cumulativePoints;
    if (cumulativePoints.length > targetPoints) {
        const step = (cumulativePoints.length - 1) / (targetPoints - 1);
        sampledPoints = [];
        for (let i = 0; i < targetPoints; i++) {
            const idx = Math.min(Math.round(i * step), cumulativePoints.length - 1);
            sampledPoints.push(cumulativePoints[idx]);
        }
        // Garante que o último ponto tem a distância total exata
        sampledPoints[sampledPoints.length - 1] = cumulativePoints[cumulativePoints.length - 1];
    }

    return {
        totalKm: Math.round(totalDistKm * 10) / 10,
        elevationGain: Math.round(elevationGain),
        elevationLoss: Math.round(elevationLoss),
        minAltitude: Math.round(minEle),
        maxAltitude: Math.round(maxEle),
        pointsCount: rawPoints.length,
        profile: sampledPoints
    };
}
