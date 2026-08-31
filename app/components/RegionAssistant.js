"use client";

import { useState } from 'react';
import { MapPin } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export default function RegionAssistant({ onApply }) {
    const { t } = useTranslation();
    const [isLocating, setIsLocating] = useState(false);
    const [addressInput, setAddressInput] = useState('');
    const [locationMessage, setLocationMessage] = useState('');
    const [suggestedRegiao, setSuggestedRegiao] = useState(null);

    const mapDistrictToRegion = (districtStr) => {
        const d = (districtStr || '').toLowerCase();
        if (d.includes('braga') || d.includes('viana do castelo')) return 'AC Minho';
        if (d.includes('porto')) return 'AC Porto';
        if (d.includes('vila real') || d.includes('bragança') || d.includes('braganca')) return 'AC Vila Real';
        if (d.includes('aveiro') || d.includes('coimbra')) return 'AC Beira Litoral';
        if (d.includes('viseu')) return 'AC Beira Alta';
        if (d.includes('guarda') || d.includes('castelo branco')) return 'AC Beira Interior';
        if (d.includes('santarém') || d.includes('santarem') || d.includes('leiria') || d.includes('portalegre') || d.includes('lisboa')) return 'AC Santarém';
        if (d.includes('setúbal') || d.includes('setubal') || d.includes('évora') || d.includes('evora') || d.includes('beja')) return 'AC Setúbal';
        if (d.includes('faro') || d.includes('algarve')) return 'AC Algarve';
        if (d.includes('madeira')) return 'AC Madeira';
        if (d.includes('açores') || d.includes('acores') || d.includes('azores')) return 'AC Açores';
        return 'Todas'; 
    };

    const handleGeolocation = () => {
        if (!navigator.geolocation) {
            setLocationMessage(t('region_no_gps'));
            return;
        }
        setIsLocating(true);
        setLocationMessage(t('region_detecting_satellites'));
        
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await res.json();
                
                const district = data.address?.county || data.address?.state_district || data.address?.city || data.address?.state || '';
                const region = mapDistrictToRegion(district);
                
                setSuggestedRegiao(region);
                setLocationMessage(`📍 ${district || 'OK'} ➔ ${region !== 'Todas' ? region : 'Múltiplas'}`);
            } catch (err) {
                setLocationMessage("Erro ao comunicar com o servidor de mapas.");
                setSuggestedRegiao(null);
            }
            setIsLocating(false);
        }, (error) => {
            setLocationMessage("Permissão negada ou GPS inativo.");
            setIsLocating(false);
        });
    };

    const handleAddressSearch = async () => {
        if (!addressInput) return;
        setIsLocating(true);
        setLocationMessage(t('region_searching'));
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&countrycodes=pt&q=${encodeURIComponent(addressInput)}`);
            const data = await res.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                const region = mapDistrictToRegion(result.display_name);
                setSuggestedRegiao(region);
                setLocationMessage(`📍 ${result.display_name.split(',')[0]} ➔ ${region !== 'Todas' ? region : 'Nenhuma Região'}`);
            } else {
                setLocationMessage("Localização não encontrada em Portugal.");
                setSuggestedRegiao(null);
            }
        } catch (err) {
            setLocationMessage("Erro ao procurar morada.");
            setSuggestedRegiao(null);
        }
        setIsLocating(false);
    };

    const applyRegiao = () => {
        if (suggestedRegiao && onApply) {
            onApply(suggestedRegiao);
            setLocationMessage(t('region_applied_success'));
            setTimeout(() => {
                setSuggestedRegiao(null);
                setLocationMessage('');
                setAddressInput('');
            }, 2000);
        }
    };

    return (
        <div className="bg-surface border border-line rounded-2xl w-full max-w-lg shadow-2xl p-6 sm:p-8 text-ink transition-colors duration-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="inline-flex shrink-0 items-center justify-center w-12 h-12 rounded-xl bg-brand-soft text-brand">
                    <MapPin size={23} aria-hidden="true" />
                </div>
                <div>
                    <h2 className="m-0 text-ink text-xl font-bold tracking-tight">{t('region_modal_title')}</h2>
                    <p className="text-muted text-xs mt-0.5">{t('region_modal_desc')}</p>
                </div>
            </div>
            
            <div className="flex flex-col gap-5">
                <button 
                    onClick={handleGeolocation} 
                    disabled={isLocating} 
                    className="w-full py-3.5 px-4 rounded-xl bg-brand hover:brightness-110 text-surface font-semibold shadow-sm transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                    {isLocating ? t('action_loading') : t('region_btn_gps')}
                </button>
                
                <div className="flex items-center gap-3">
                    <hr className="flex-1 border-line" />
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase">{t('region_or')}</span>
                    <hr className="flex-1 border-line" />
                </div>

                <div className="flex gap-2.5 w-full">
                    <input 
                        type="text" 
                        aria-label={t('region_placeholder_city')}
                        placeholder={t('region_placeholder_city')}
                        value={addressInput}
                        onChange={e => setAddressInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddressSearch()}
                        className="min-w-0 w-full flex-1 py-3 px-3 rounded-xl border border-line bg-soft text-ink text-base outline-none focus:border-brand transition-colors placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <button 
                        onClick={handleAddressSearch} 
                        disabled={isLocating} 
                        className="py-3 px-5 rounded-xl border border-line hover:bg-slate-200 dark:hover:bg-slate-700 bg-soft text-ink font-semibold text-sm transition-colors cursor-pointer"
                    >
                        {t('region_btn_search')}
                    </button>
                </div>

                {locationMessage && (
                    <div className={`p-4 bg-soft border rounded-xl mt-2 text-sm text-ink flex flex-col gap-3 shadow-lg ${suggestedRegiao ? 'border-blue-500/40' : 'border-amber-500/40'}`}>
                        <span className="font-medium text-ink">{locationMessage}</span>
                        {suggestedRegiao && (
                            <button 
                                onClick={applyRegiao}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-md cursor-pointer"
                            >
                                {t('region_btn_apply')} ({suggestedRegiao})
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
