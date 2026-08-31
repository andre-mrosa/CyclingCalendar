import { useState, useEffect } from 'react';
import { Cloud, Sun, CloudRain, CloudSun, CloudLightning, CloudDrizzle, CloudFog, Wind, Droplets, Thermometer, Sparkles, Calendar, Info, RefreshCw } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

function getWeatherIcon(iconType, className = "w-6 h-6") {
    switch (iconType) {
        case 'sun':
            return <Sun className={`text-amber-500 ${className}`} />;
        case 'sun-cloud':
        case 'cloud-sun':
            return <CloudSun className={`text-amber-500 dark:text-amber-400 ${className}`} />;
        case 'cloud':
            return <Cloud className={`text-slate-400 ${className}`} />;
        case 'drizzle':
            return <CloudDrizzle className={`text-blue-400 ${className}`} />;
        case 'rain-light':
        case 'rain':
        case 'cloud-rain':
        case 'showers':
            return <CloudRain className={`text-blue-500 ${className}`} />;
        case 'rain-heavy':
            return <CloudRain className={`text-indigo-600 dark:text-indigo-400 ${className}`} />;
        case 'thunderstorm':
            return <CloudLightning className={`text-purple-500 ${className}`} />;
        case 'fog':
            return <CloudFog className={`text-slate-400 ${className}`} />;
        default:
            return <CloudSun className={`text-blue-500 ${className}`} />;
    }
}

export default function WeatherWidget({ location, distrito, date, variant = 'default' }) {
    const { t, language } = useTranslation();
    const [weatherData, setWeatherData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!date) {
            setIsLoading(false);
            return;
        }

        let isCancelled = false;
        setIsLoading(true);
        setError(null);

        const fetchWeather = async () => {
            try {
                const params = new URLSearchParams();
                if (location) params.set('location', location);
                if (distrito) params.set('distrito', distrito);
                params.set('date', date);

                const res = await fetch(`/api/weather?${params.toString()}`);
                const data = await res.json();

                if (!isCancelled) {
                    if (data.success) {
                        setWeatherData(data);
                    } else {
                        setError(data.error || 'Não foi possível carregar a meteorologia');
                    }
                }
            } catch (err) {
                if (!isCancelled) {
                    console.error('Weather fetch error:', err);
                    setError('Erro ao contactar serviço meteorológico');
                }
            } finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };

        fetchWeather();

        return () => {
            isCancelled = true;
        };
    }, [location, distrito, date]);

    if (isLoading) {
        if (variant === 'header') {
            return (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-soft border border-line animate-pulse shrink-0">
                    <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    <div className="h-3 w-14 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
            );
        }
        if (variant === 'mobile-badge') {
            return (
                <div className="flex sm:hidden items-center gap-1.5 px-2 py-1 rounded-lg bg-soft animate-pulse shrink-0">
                    <div className="w-3.5 h-3.5 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                    <div className="h-3 w-8 bg-slate-200 dark:bg-slate-700 rounded"></div>
                </div>
            );
        }
        return (
            <div className="p-3.5 rounded-2xl bg-soft border border-slate-200/80 dark:border-slate-800 shadow-xs animate-pulse">
                <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="h-4 w-36 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                    <div className="h-3 w-16 bg-slate-200 dark:bg-slate-800 rounded-md"></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                    <div className="h-14 bg-slate-200/70 dark:bg-slate-800/60 rounded-xl"></div>
                    <div className="h-14 bg-slate-200/70 dark:bg-slate-800/60 rounded-xl"></div>
                    <div className="h-14 bg-slate-200/70 dark:bg-slate-800/60 rounded-xl"></div>
                </div>
            </div>
        );
    }

    if (error || !weatherData) {
        return null; // Ocultar silenciosamente caso não haja dados
    }

    // 1. Prova com Meteorologia Disponível (Próximos 14 dias)
    if (weatherData.isAvailable && weatherData.data) {
        const d = weatherData.data;
        const iconType = d.condition?.icon || 'sun-cloud';
        const dayLabel = d.diffDays === 0 ? t('weather_today') : d.diffDays === 1 ? t('weather_tomorrow') : t('weather_in_days').replace('{days}', d.diffDays);

        // Variant: Header (Desktop Top Right Pill)
        if (variant === 'header') {
            return (
                <div 
                    className="hidden sm:flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/30 text-ink text-xs shrink-0 select-none transition-all shadow-xs hover:border-sky-500/50"
                    title={`${t('weather_forecast_title')} (${dayLabel}) : ${d.condition?.label || ''} • Máx ${d.tempMax}°C / Mín ${d.tempMin}°C • ${t('weather_rain')} ${d.rainProb}% • ${t('weather_wind')} ${d.windSpeed} km/h ${d.windDirection}`}
                >
                    <div className="flex items-center gap-1.5 text-sky-600 dark:text-sky-400 font-bold">
                        {getWeatherIcon(iconType, "w-4 h-4 shrink-0")}
                        <span className="text-sm font-black text-ink">{d.tempMax}°C</span>
                        <span className="text-[10px] text-slate-400 font-semibold">/{d.tempMin}°</span>
                    </div>
                    <div className="h-3.5 w-px bg-sky-500/30"></div>
                    <div className="flex items-center gap-2 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                        <span className="flex items-center gap-0.5 text-blue-500 font-semibold" title={t('weather_rain_prob')}>
                            <Droplets size={11} className="shrink-0" /> {d.rainProb}%
                        </span>
                        <span className="flex items-center gap-0.5 text-teal-600 dark:text-teal-400 font-semibold" title={`${t('weather_wind')} ${d.windSpeed} km/h`}>
                            <Wind size={11} className="shrink-0" /> {d.windSpeed}km/h
                        </span>
                    </div>
                </div>
            );
        }

        // Variant: Mobile Badge
        if (variant === 'mobile-badge') {
            return (
                <div 
                    className="flex sm:hidden items-center gap-1.5 px-2 py-1 rounded-lg bg-sky-500/10 dark:bg-sky-500/15 border border-sky-500/25 text-ink text-xs shrink-0 select-none"
                    title={`${t('weather_forecast_title')}: ${d.condition?.label || ''} • ${d.tempMax}°C / ${d.tempMin}°C`}
                >
                    {getWeatherIcon(iconType, "w-3.5 h-3.5 shrink-0 text-sky-500")}
                    <span className="text-xs font-bold text-ink">{d.tempMax}°C</span>
                    <span className="text-[10px] text-blue-500 font-medium flex items-center gap-0.5">
                        <Droplets size={9} />{d.rainProb}%
                    </span>
                </div>
            );
        }

        return (
            <div className="mb-3 p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-sky-500/[0.07] via-slate-50 to-slate-100/90 dark:from-sky-500/10 dark:via-slate-900/90 dark:to-slate-950/80 border border-sky-500/25 shadow-sm animate-fade-in">
                {/* Header Row */}
                <div className="flex items-center justify-between gap-2 mb-3 pb-2 border-b border-slate-200/80 dark:border-slate-800/80">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-sky-500/15 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                            {getWeatherIcon(iconType, "w-4 h-4")}
                        </div>
                        <div>
                            <h4 className="text-xs sm:text-sm font-bold text-ink m-0 tracking-tight flex items-center gap-1.5">
                                <span>{t('weather_forecast_title')}</span>
                                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                                    • {dayLabel}
                                </span>
                            </h4>
                            <span className="text-[11px] text-muted font-medium block">
                                {d.condition?.label || ''}
                            </span>
                        </div>
                    </div>

                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-700 dark:text-sky-300 border border-sky-500/20 shrink-0 max-w-[130px] truncate" title={d.locationName}>
                        📍 {d.locationName || location || 'Portugal'}
                    </span>
                </div>

                {/* 3 Metric Cards */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                    {/* Temperatura */}
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between shadow-2xs">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                            <Thermometer size={12} className="text-rose-500 shrink-0" />
                            <span>{t('weather_temp')}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-base sm:text-lg font-black text-ink">{d.tempMax}°C</span>
                            <span className="text-[11px] font-semibold text-slate-400">/ {d.tempMin}°</span>
                        </div>
                        <span className="text-[10px] text-muted mt-0.5">Máx / Mín</span>
                    </div>

                    {/* Chuva */}
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between shadow-2xs">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                            <Droplets size={12} className="text-blue-500 shrink-0" />
                            <span>{t('weather_rain')}</span>
                        </div>
                        <div className="flex items-baseline gap-1.5 mt-1">
                            <span className="text-base sm:text-lg font-black text-ink">{d.rainProb}%</span>
                            <span className="text-[11px] font-semibold text-slate-400">({d.precipitationMm}mm)</span>
                        </div>
                        <span className="text-[10px] text-muted mt-0.5">{t('weather_rain_prob')}</span>
                    </div>

                    {/* Vento */}
                    <div className="p-2.5 rounded-xl bg-white/80 dark:bg-slate-800/70 border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-between shadow-2xs">
                        <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-muted">
                            <Wind size={12} className="text-teal-500 shrink-0" />
                            <span>{t('weather_wind')}</span>
                        </div>
                        <div className="flex items-baseline gap-1 mt-1">
                            <span className="text-base sm:text-lg font-black text-ink">{d.windSpeed}</span>
                            <span className="text-[11px] font-semibold text-slate-400">km/h</span>
                        </div>
                        <span className="text-[10px] text-muted mt-0.5 truncate" title={d.windDirection}>
                            {d.windDirection ? d.windDirection.split(' ')[0] : ''}
                        </span>
                    </div>
                </div>

                {/* Cycling Advice Footer */}
                {d.advice && d.advice.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 space-y-1">
                        {d.advice.map((tip, i) => (
                            <p key={i} className="text-[11px] font-medium text-ink leading-tight m-0">
                                {tip}
                            </p>
                        ))}
                    </div>
                )}
            </div>
        );
    }

    // 2. Prova a mais de 14 dias (Previsão futura fora da janela de 14 dias)
    if (weatherData.isFuture) {
        if (variant === 'header') {
            return (
                <div 
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-soft border border-line text-muted text-[11px] shrink-0"
                    title={t('weather_forecast_14d_desc').replace('{available}', weatherData.availableFrom ? weatherData.availableFrom : `${weatherData.diffDays}d`)}
                >
                    <CloudSun size={14} className="text-blue-500/80 shrink-0" />
                    <span className="font-medium">{t('weather_forecast_14d_badge')}</span>
                </div>
            );
        }

        if (variant === 'mobile-badge') {
            return (
                <div 
                    className="flex sm:hidden items-center gap-1 px-2 py-1 rounded-lg bg-soft text-muted text-[10px] shrink-0"
                    title={t('weather_forecast_14d_desc').replace('{available}', `${weatherData.diffDays}d`)}
                >
                    <CloudSun size={12} className="text-blue-500/80 shrink-0" />
                    <span>14d</span>
                </div>
            );
        }

        return (
            <div className="mb-3 p-3 sm:p-3.5 rounded-2xl bg-soft border border-slate-200/80 dark:border-slate-800 shadow-2xs flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-brand flex items-center justify-center shrink-0">
                        <CloudSun size={17} />
                    </div>
                    <div className="min-w-0">
                        <span className="font-bold text-ink block truncate leading-snug">
                            {t('weather_race_day_title')}
                        </span>
                        <span className="text-[11px] text-muted block truncate">
                            {t('weather_forecast_14d_desc').replace('{available}', weatherData.availableFrom ? weatherData.availableFrom : `${weatherData.diffDays}d`)}
                        </span>
                    </div>
                </div>

                <span className="hidden sm:inline-flex px-2 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-800 text-[10px] font-semibold text-muted shrink-0">
                    {t('weather_high_res')}
                </span>
            </div>
        );
    }

    return null;
}
