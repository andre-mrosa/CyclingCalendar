import { resolveCoordinates, getWindDirection, parseWmoCode, getCyclingAdvice } from '@/app/lib/weather';

export const dynamic = 'force-dynamic';

// Cache em memória com TTL de 1 hora
const weatherCache = new Map();
const CACHE_TTL_MS = 60 * 60 * 1000;

function parseDateInput(rawDate) {
    if (!rawDate) return null;
    
    // Se for formato ISO tipo YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}/.test(rawDate)) {
        return rawDate.substring(0, 10);
    }

    // Se for formato "15 MAR 2026" ou "10 a 12 MAI 2026"
    const months = {
        'JAN': '01', 'FEV': '02', 'MAR': '03', 'ABR': '04',
        'MAI': '05', 'JUN': '06', 'JUL': '07', 'AGO': '08',
        'SET': '09', 'OUT': '10', 'NOV': '11', 'DEZ': '12'
    };

    const parts = rawDate.trim().split(/\s+/);
    const day = parts[0].replace(/\D/g, '').padStart(2, '0');
    const monthStr = parts.find(p => months[p.toUpperCase()]);
    const month = monthStr ? months[monthStr.toUpperCase()] : null;
    const year = parts.find(p => /^20\d{2}$/.test(p)) || new Date().getFullYear().toString();

    if (day && month && year) {
        return `${year}-${month}-${day}`;
    }

    return null;
}

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const location = searchParams.get('location') || '';
        const distrito = searchParams.get('distrito') || '';
        const rawDate = searchParams.get('date') || '';

        const targetDateStr = parseDateInput(rawDate);
        if (!targetDateStr) {
            return Response.json({ success: false, error: 'Data inválida ou não fornecida' }, { status: 400 });
        }

        const cacheKey = `${location.toLowerCase()}_${distrito.toLowerCase()}_${targetDateStr}`;
        const cached = weatherCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp < CACHE_TTL_MS)) {
            return Response.json(cached.data);
        }

        const targetDate = new Date(`${targetDateStr}T12:00:00Z`);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const diffTime = targetDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // 1. Provas passadas
        if (diffDays < -1) {
            const result = {
                success: true,
                isAvailable: false,
                isPast: true,
                targetDate: targetDateStr,
                message: 'Esta prova já foi realizada.'
            };
            return Response.json(result);
        }

        // 2. Provas com data superior a 14-16 dias (fora do alcance de alta precisão)
        if (diffDays > 14) {
            const availableFromDate = new Date(targetDate.getTime() - 14 * 24 * 60 * 60 * 1000);
            const result = {
                success: true,
                isAvailable: false,
                isFuture: true,
                diffDays,
                targetDate: targetDateStr,
                availableFrom: availableFromDate.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' }),
                message: `Previsão meteorológica detalhada disponível a partir de ${availableFromDate.toLocaleDateString('pt-PT', { day: '2-digit', month: 'long' })} (a 14 dias da prova).`
            };
            return Response.json(result);
        }

        // 3. Prova nos próximos 14 dias -> Consultar Open-Meteo
        const coords = await resolveCoordinates(location, distrito);
        const openMeteoUrl = `https://api.open-meteo.com/v1/forecast?latitude=${coords.lat}&longitude=${coords.lon}&daily=weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant&timezone=Europe%2FLisbon&start_date=${targetDateStr}&end_date=${targetDateStr}`;

        const res = await fetch(openMeteoUrl, {
            headers: { 'Accept': 'application/json' },
            signal: AbortSignal.timeout(5000)
        });

        if (!res.ok) {
            throw new Error(`Open-Meteo HTTP ${res.status}`);
        }

        const data = await res.json();
        const daily = data?.daily;

        if (!daily || !daily.temperature_2m_max || daily.temperature_2m_max.length === 0) {
            return Response.json({
                success: true,
                isAvailable: false,
                message: 'Sem dados meteorológicos disponíveis para este dia.'
            });
        }

        const tempMax = Math.round(daily.temperature_2m_max[0]);
        const tempMin = Math.round(daily.temperature_2m_min[0]);
        const rainProb = Math.round(daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : 0);
        const precipitationMm = daily.precipitation_sum ? Math.round(daily.precipitation_sum[0] * 10) / 10 : 0;
        const windSpeed = Math.round(daily.windspeed_10m_max ? daily.windspeed_10m_max[0] : 0);
        const windDirDeg = daily.winddirection_10m_dominant ? daily.winddirection_10m_dominant[0] : null;
        const windDirection = getWindDirection(windDirDeg);
        const weatherCode = daily.weathercode ? daily.weathercode[0] : 0;
        const condition = parseWmoCode(weatherCode);
        const advice = getCyclingAdvice({ tempMax, tempMin, rainProb, windSpeed });

        const result = {
            success: true,
            isAvailable: true,
            data: {
                locationName: coords.name,
                targetDate: targetDateStr,
                diffDays,
                tempMax,
                tempMin,
                rainProb,
                precipitationMm,
                windSpeed,
                windDirection,
                condition,
                advice
            }
        };

        // Guardar em cache
        weatherCache.set(cacheKey, { timestamp: Date.now(), data: result });

        return Response.json(result);

    } catch (error) {
        console.error('Error fetching weather:', error);
        return Response.json({ success: false, error: error.message }, { status: 500 });
    }
}
