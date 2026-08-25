"use client";

import { useState } from 'react';

export default function RegionAssistant({ onApply }) {
    const [isLocating, setIsLocating] = useState(false);
    const [addressInput, setAddressInput] = useState('');
    const [locationMessage, setLocationMessage] = useState('');
    const [suggestedRegiao, setSuggestedRegiao] = useState(null);

    const mapDistrictToRegion = (districtStr) => {
        const d = districtStr.toLowerCase();
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
            setLocationMessage("O teu browser não suporta GPS.");
            return;
        }
        setIsLocating(true);
        setLocationMessage("A detetar satélites...");
        
        navigator.geolocation.getCurrentPosition(async (position) => {
            try {
                const { latitude, longitude } = position.coords;
                const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
                const data = await res.json();
                
                const district = data.address?.county || data.address?.state_district || data.address?.city || data.address?.state || '';
                const region = mapDistrictToRegion(district);
                
                setSuggestedRegiao(region);
                setLocationMessage(`📍 ${district || 'Encontrado'} ➔ ${region !== 'Todas' ? region : 'Múltiplas'}`);
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
        setLocationMessage("A procurar região...");
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressInput + ', Portugal')}`);
            const data = await res.json();
            
            if (data && data.length > 0) {
                const result = data[0];
                const region = mapDistrictToRegion(result.display_name);
                setSuggestedRegiao(region);
                setLocationMessage(`📍 Definido ➔ ${region !== 'Todas' ? region : 'Nenhuma Região'}`);
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
            setLocationMessage("Região aplicada com sucesso!");
            setTimeout(() => {
                setSuggestedRegiao(null);
                setLocationMessage('');
                setAddressInput('');
            }, 2000);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 sm:p-8 text-slate-900 dark:text-slate-100 transition-colors duration-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <span className="text-xl">📍</span>
                </div>
                <div>
                    <h2 className="m-0 text-slate-900 dark:text-white text-xl font-bold tracking-tight">Assistente de Região</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Descobre a tua Associação Regional</p>
                </div>
            </div>
            
            <div className="flex flex-col gap-5">
                <button 
                    onClick={handleGeolocation} 
                    disabled={isLocating} 
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 transition-colors text-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
                >
                    {isLocating ? 'A localizar...' : 'Usar Localização GPS'}
                </button>
                
                <div className="flex items-center gap-3">
                    <hr className="flex-1 border-slate-200 dark:border-slate-800" />
                    <span className="text-slate-400 dark:text-slate-500 text-xs font-bold uppercase">OU</span>
                    <hr className="flex-1 border-slate-200 dark:border-slate-800" />
                </div>

                <div className="flex gap-2.5 w-full">
                    <input 
                        type="text" 
                        placeholder="Cidade, Concelho ou Distrito..."
                        value={addressInput}
                        onChange={e => setAddressInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddressSearch()}
                        className="flex-1 py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors shadow-inner placeholder-slate-400 dark:placeholder-slate-500"
                    />
                    <button 
                        onClick={handleAddressSearch} 
                        disabled={isLocating} 
                        className="py-3 px-5 rounded-xl border border-slate-200 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold text-sm transition-colors cursor-pointer"
                    >
                        Procurar
                    </button>
                </div>

                {locationMessage && (
                    <div className={`p-4 bg-slate-50 dark:bg-slate-950/60 border rounded-xl mt-2 text-sm text-slate-800 dark:text-slate-200 flex flex-col gap-3 shadow-lg ${suggestedRegiao ? 'border-blue-500/40' : 'border-amber-500/40'}`}>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{locationMessage}</span>
                        {suggestedRegiao && (
                            <button 
                                onClick={applyRegiao}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-md cursor-pointer"
                            >
                                Aplicar {suggestedRegiao}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
