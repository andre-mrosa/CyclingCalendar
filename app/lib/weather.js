/**
 * Coordenadas geográficas dos distritos e principais polos de ciclismo em Portugal
 */
export const PORTUGAL_COORDINATES = {
    // 18 Distritos de Portugal Continental
    'aveiro': { lat: 40.6405, lon: -8.6538, name: 'Aveiro' },
    'beja': { lat: 38.0151, lon: -7.8632, name: 'Beja' },
    'braga': { lat: 41.5454, lon: -8.4265, name: 'Braga' },
    'braganca': { lat: 41.8058, lon: -6.7572, name: 'Bragança' },
    'bragança': { lat: 41.8058, lon: -6.7572, name: 'Bragança' },
    'castelo branco': { lat: 39.8222, lon: -7.4931, name: 'Castelo Branco' },
    'coimbra': { lat: 40.2033, lon: -8.4103, name: 'Coimbra' },
    'evora': { lat: 38.5714, lon: -7.9135, name: 'Évora' },
    'évora': { lat: 38.5714, lon: -7.9135, name: 'Évora' },
    'faro': { lat: 37.0194, lon: -7.9304, name: 'Faro / Algarve' },
    'algarve': { lat: 37.0194, lon: -7.9304, name: 'Algarve' },
    'guarda': { lat: 40.5373, lon: -7.2658, name: 'Guarda' },
    'leiria': { lat: 39.7438, lon: -8.8078, name: 'Leiria' },
    'lisboa': { lat: 38.7223, lon: -9.1393, name: 'Lisboa' },
    'portalegre': { lat: 39.2938, lon: -7.4312, name: 'Portalegre' },
    'porto': { lat: 41.1579, lon: -8.6291, name: 'Porto' },
    'santarem': { lat: 39.2362, lon: -8.6855, name: 'Santarém' },
    'santarém': { lat: 39.2362, lon: -8.6855, name: 'Santarém' },
    'setubal': { lat: 38.5244, lon: -8.8882, name: 'Setúbal' },
    'setúbal': { lat: 38.5244, lon: -8.8882, name: 'Setúbal' },
    'viana do castelo': { lat: 41.6918, lon: -8.8344, name: 'Viana do Castelo' },
    'vila real': { lat: 41.3006, lon: -7.7441, name: 'Vila Real' },
    'viseu': { lat: 40.6575, lon: -7.9143, name: 'Viseu' },

    // Regiões Autónomas
    'madeira': { lat: 32.6500, lon: -16.9089, name: 'Funchal / Madeira' },
    'funchal': { lat: 32.6500, lon: -16.9089, name: 'Funchal' },
    'acores': { lat: 37.7412, lon: -25.6756, name: 'Ponta Delgada / Açores' },
    'açores': { lat: 37.7412, lon: -25.6756, name: 'Açores' },

    // Destinos frequentes de Ciclismo / Montanhas
    'serra da estrela': { lat: 40.3219, lon: -7.6129, name: 'Serra da Estrela' },
    'torre': { lat: 40.3219, lon: -7.6129, name: 'Torre (Serra da Estrela)' },
    'geres': { lat: 41.7289, lon: -8.1561, name: 'Gerês' },
    'gerês': { lat: 41.7289, lon: -8.1561, name: 'Gerês' },
    'lousa': { lat: 40.1108, lon: -8.2458, name: 'Serra da Lousã' },
    'lousã': { lat: 40.1108, lon: -8.2458, name: 'Lousã' },
    'monchique': { lat: 37.3197, lon: -8.5547, name: 'Serra de Monchique' },
    'foia': { lat: 37.3147, lon: -8.5961, name: 'Fóia' },
    'agueda': { lat: 40.5756, lon: -8.4439, name: 'Águeda' },
    'águeda': { lat: 40.5756, lon: -8.4439, name: 'Águeda' },
    'anadia': { lat: 40.4411, lon: -8.4344, name: 'Anadia (Sangalhos)' },
    'sangalhos': { lat: 40.4889, lon: -8.4689, name: 'Velódromo de Sangalhos' },
    'marinha grande': { lat: 39.7483, lon: -8.9325, name: 'Marinha Grande' },
    'penafiel': { lat: 41.2069, lon: -8.2839, name: 'Penafiel' },
    'fafe': { lat: 41.4517, lon: -8.1728, name: 'Fafe' },
    'guimaraes': { lat: 41.4425, lon: -8.2918, name: 'Guimarães' },
    'guimarães': { lat: 41.4425, lon: -8.2918, name: 'Guimarães' },
    'tavira': { lat: 37.1265, lon: -7.6496, name: 'Tavira' },
    'loule': { lat: 37.1378, lon: -8.0202, name: 'Loulé' },
    'loulé': { lat: 37.1378, lon: -8.0202, name: 'Loulé' },
    'albufeira': { lat: 37.0891, lon: -8.2478, name: 'Albufeira' },
    'portimao': { lat: 37.1363, lon: -8.5377, name: 'Portimão' },
    'portimão': { lat: 37.1363, lon: -8.5377, name: 'Portimão' }
};

/**
 * Converte graus de vento (0-360) em direção cardeal em português
 */
export function getWindDirection(deg) {
    if (typeof deg !== 'number') return 'Variável';
    const directions = [
        'Norte (N)', 'Norte-Nordeste (NNE)', 'Nordeste (NE)', 'Este-Nordeste (ENE)',
        'Este (E)', 'Este-Sudeste (ESE)', 'Sudeste (SE)', 'Sul-Sudeste (SSE)',
        'Sul (S)', 'Sul-Sudoeste (SSO)', 'Sudoeste (SO)', 'Oeste-Sudoeste (OSO)',
        'Oeste (O)', 'Oeste-Noroeste (ONO)', 'Noroeste (NO)', 'Norte-Noroeste (NNO)'
    ];
    const index = Math.round(deg / 22.5) % 16;
    return directions[index];
}

/**
 * Traduz WMO Weather Code para texto em português e tipo de ícone
 */
export function parseWmoCode(code) {
    switch (code) {
        case 0:
            return { label: 'Céu Limpo / Ensolarado', icon: 'sun', condition: 'clear' };
        case 1:
            return { label: 'Pouco Nublado', icon: 'sun-cloud', condition: 'mainly-clear' };
        case 2:
            return { label: 'Parcialmente Nublado', icon: 'cloud-sun', condition: 'partly-cloudy' };
        case 3:
            return { label: 'Encoberto / Nublado', icon: 'cloud', condition: 'overcast' };
        case 45:
        case 48:
            return { label: 'Nevoeiro / Neblina', icon: 'fog', condition: 'fog' };
        case 51:
        case 53:
        case 55:
            return { label: 'Chuviscos Fracos', icon: 'drizzle', condition: 'drizzle' };
        case 61:
            return { label: 'Chuva Fraca', icon: 'rain-light', condition: 'rain' };
        case 63:
            return { label: 'Chuva Moderada', icon: 'rain', condition: 'rain' };
        case 65:
            return { label: 'Chuva Forte', icon: 'rain-heavy', condition: 'heavy-rain' };
        case 71:
        case 73:
        case 75:
            return { label: 'Queda de Neve', icon: 'snow', condition: 'snow' };
        case 80:
        case 81:
        case 82:
            return { label: 'Aguaceiros', icon: 'cloud-rain', condition: 'showers' };
        case 95:
        case 96:
        case 99:
            return { label: 'Trovoada', icon: 'thunderstorm', condition: 'thunderstorm' };
        default:
            return { label: 'Céu Nublado', icon: 'cloud', condition: 'cloudy' };
    }
}

/**
 * Gera conselhos práticos e úteis para os ciclistas com base na meteorologia
 */
export function getCyclingAdvice({ tempMax, tempMin, rainProb, windSpeed }) {
    const tips = [];

    // Vento
    if (windSpeed >= 35) {
        tips.push('⚠️ Vento muito forte (> 35 km/h). Cuidado com rodas de perfil alto e rajadas laterais.');
    } else if (windSpeed >= 22) {
        tips.push('💨 Vento moderado a forte. Poupa energia em grupo / no pelotão.');
    }

    // Chuva
    if (rainProb >= 65) {
        tips.push('🌧️ Elevada probabilidade de chuva. Leva capa impermeável, corta-vento e cuidado com pisos escorregadios.');
    } else if (rainProb >= 35) {
        tips.push('⛅ Possibilidade de aguaceiros dispersos. Recomendado levar corta-vento no bolso.');
    }

    // Temperatura
    if (tempMax >= 32) {
        tips.push('🔥 Temperatura muito elevada (> 32°C). Hidratação reforçada e proteção solar indispensável.');
    } else if (tempMin <= 5) {
        tips.push('❄️ Início de prova frio (≤ 5°C). Roupa térmica, luvas longas e manguitos recomendados.');
    } else if (tempMax >= 18 && tempMax <= 25 && windSpeed < 20 && rainProb < 20) {
        tips.push('🚴‍♂️ Condições perfeitas para pedalar e bater recordes!');
    }

    return tips.length > 0 ? tips : ['☀️ Condições favoráveis para a prova. Boa viagem e boas pedaladas!'];
}

/**
 * Procura coordenadas na base de dados de cidades portuguesas ou via Open-Meteo Geocoding
 */
export async function resolveCoordinates(locationStr, distritoStr) {
    const normalize = (s) => (s || '').toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .trim();

    const locNorm = normalize(locationStr);
    const distNorm = normalize(distritoStr);

    // 1. Procurar em correspondência direta no dicionário local
    for (const [key, coords] of Object.entries(PORTUGAL_COORDINATES)) {
        const keyNorm = normalize(key);
        if (locNorm.includes(keyNorm) || keyNorm.includes(locNorm)) {
            return coords;
        }
    }

    if (distNorm) {
        for (const [key, coords] of Object.entries(PORTUGAL_COORDINATES)) {
            const keyNorm = normalize(key);
            if (distNorm.includes(keyNorm) || keyNorm.includes(distNorm)) {
                return coords;
            }
        }
    }

    // 2. Geocoding dinâmico na API do Open-Meteo
    const query = locationStr && locationStr !== 'A definir' ? locationStr : distritoStr;
    if (query && query !== 'A definir' && query !== 'Nacional') {
        try {
            const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&country=PT&count=1&language=pt`, {
                headers: { 'Accept': 'application/json' },
                signal: AbortSignal.timeout(3500)
            });
            if (geoRes.ok) {
                const geoData = await geoRes.json();
                if (geoData?.results && geoData.results.length > 0) {
                    const first = geoData.results[0];
                    return {
                        lat: first.latitude,
                        lon: first.longitude,
                        name: `${first.name}${first.admin1 ? ', ' + first.admin1 : ''}`
                    };
                }
            }
        } catch (e) {
            console.warn('Geocoding fallback failed:', e);
        }
    }

    // Default: Coordenadas centrais de Portugal (Coimbra / Centro)
    return { lat: 40.2033, lon: -8.4103, name: 'Portugal Continental' };
}
