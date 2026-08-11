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

    const buttonStyle = {
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius-md)', 
        border: '1px solid var(--card-border)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        transition: 'var(--transition)',
        fontWeight: 'bold',
        minWidth: '140px', 
        whiteSpace: 'nowrap',
        flexShrink: 0
    };

    const selectStyle = {
        padding: '0.5rem 1rem',
        borderRadius: 'var(--radius-md)', 
        border: '1px solid var(--card-border)',
        background: 'var(--card-bg)',
        color: 'var(--text-primary)',
        fontSize: '0.95rem',
        minWidth: '150px',
        maxWidth: '300px',
        flexShrink: 0
    };

    return (
        <div style={{
            background: 'var(--bg-secondary)',
            border: '1px solid var(--card-border)',
            padding: '2rem',
            borderRadius: 'var(--radius-lg)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '1.5rem' }}>📍</span>
                <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem' }}>Assistente de Região</h2>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Não sabes a que Associação Regional pertences? Nós detetamos automaticamente.
            </p>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                <button 
                    onClick={handleGeolocation} 
                    disabled={isLocating} 
                    style={{
                        ...buttonStyle, 
                        background: 'var(--accent-primary)',
                        color: 'white',
                        border: 'none',
                        width: '100%'
                    }}
                >
                    Usar GPS Atual
                </button>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <hr style={{ flex: 1, borderColor: 'var(--card-border)', borderTop: 'none' }} />
                    <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>OU</span>
                    <hr style={{ flex: 1, borderColor: 'var(--card-border)', borderTop: 'none' }} />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                    <input 
                        type="text" 
                        placeholder="Cidade ou Distrito..."
                        value={addressInput}
                        onChange={e => setAddressInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleAddressSearch()}
                        style={{ 
                            ...selectStyle, 
                            flex: 1,
                            minWidth: '0'
                        }}
                    />
                    <button 
                        onClick={handleAddressSearch} 
                        disabled={isLocating} 
                        style={{
                            ...buttonStyle, 
                            background: 'var(--card-bg)',
                            color: 'var(--text-primary)',
                            minWidth: 'auto'
                        }}
                    >
                        Procurar
                    </button>
                </div>

                {locationMessage && (
                    <div style={{ 
                        padding: '0.75rem', 
                        background: 'var(--card-bg)', 
                        borderLeft: `4px solid ${suggestedRegiao ? 'var(--accent-primary)' : 'orange'}`,
                        borderRadius: '4px',
                        marginTop: '0.5rem',
                        fontSize: '0.9rem',
                        color: 'var(--text-primary)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '0.5rem'
                    }}>
                        <span>{locationMessage}</span>
                        {suggestedRegiao && (
                            <button 
                                onClick={applyRegiao}
                                style={{
                                    padding: '0.4rem',
                                    background: 'var(--accent-primary)',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    fontSize: '0.85rem'
                                }}
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
