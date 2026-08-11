"use client";

import { useContext, useState } from 'react';
import { SettingsContext } from '../SettingsContext';

export default function Conta() {
    const { 
        isDarkMode, toggleTheme,
        defaultEscalao, updateDefaultEscalao,
        defaultRegiao, updateDefaultRegiao,
        useCurrentMonth, toggleUseCurrentMonth,
        selectedSources, toggleSource
    } = useContext(SettingsContext);

    const [isLocating, setIsLocating] = useState(false);
    const [addressInput, setAddressInput] = useState('');
    const [locationMessage, setLocationMessage] = useState('');
    const [suggestedRegiao, setSuggestedRegiao] = useState(null);

    // Escalao Helper State
    const [birthYear, setBirthYear] = useState('');
    const [gender, setGender] = useState('M');
    const [licenseType, setLicenseType] = useState('Competição');
    const [teamLevel, setTeamLevel] = useState('Clube');
    const [escalaoMessage, setEscalaoMessage] = useState('');
    const [suggestedEscalao, setSuggestedEscalao] = useState(null);

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
        if (suggestedRegiao) {
            updateDefaultRegiao(suggestedRegiao);
            setLocationMessage("Região guardada nas preferências!");
            setTimeout(() => {
                setSuggestedRegiao(null);
                setLocationMessage('');
                setAddressInput('');
            }, 3000);
        }
    };

    const calculateEscalao = () => {
        if (!birthYear || isNaN(birthYear) || birthYear.length !== 4) {
            setEscalaoMessage("Introduz um ano de nascimento válido (ex: 1990).");
            setSuggestedEscalao(null);
            return;
        }
        const currentYear = new Date().getFullYear();
        const age = currentYear - parseInt(birthYear);
        
        if (age < 5 || age > 100) {
            setEscalaoMessage("Idade fora dos limites habituais de competição.");
            setSuggestedEscalao(null);
            return;
        }
        
        let result = '';
        
        if (gender === 'F') {
            result = 'Femininas';
        } else if (licenseType === 'CPT') {
            result = 'Todos'; 
        } else {
            if (age <= 14) result = 'Escolas';
            else if (age <= 16) result = 'Sub-17 (Cadetes)';
            else if (age <= 18) result = 'Sub-19 (Juniores)';
            else if (age <= 22) {
                if (teamLevel === 'Individual') result = 'Elite Amador / Individual';
                else result = 'Sub-23';
            }
            else if (age <= 29) {
                if (teamLevel === 'Individual') result = 'Elite Amador / Individual';
                else result = 'Elite / Sub-23'; 
            }
            else {
                // 30+ years old
                if (teamLevel === 'Profissional') result = 'Elite / Sub-23'; // Pros over 30 are Elite
                else result = 'Masters / Veteranos';
            }
        }
        
        setSuggestedEscalao(result);
        setEscalaoMessage(`Resultado: ${result}`);
    };

    const applyEscalao = () => {
        if (suggestedEscalao) {
            updateDefaultEscalao(suggestedEscalao);
            setEscalaoMessage("Escalão guardado nas preferências!");
            setTimeout(() => {
                setSuggestedEscalao(null);
                setEscalaoMessage('');
                setBirthYear('');
            }, 3000);
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
        <div className="app-container" style={{ padding: '2rem' }}>
            <header style={{ marginBottom: '2rem' }}>
                <h1>Definições de Conta</h1>
                <p>Gere as tuas preferências de visualização e utiliza os assistentes</p>
            </header>

            <main style={{
                display: 'flex',
                gap: '2rem',
                flexWrap: 'wrap',
                maxWidth: '1200px'
            }}>
                {/* Coluna Esquerda: Definições Manuais */}
                <div style={{ flex: '1 1 500px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    <section style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)'
                    }}>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Aparência</h2>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Modo Noturno</h3>
                                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Ativar ou desativar o tema escuro.
                                </p>
                            </div>
                            
                            <button 
                                onClick={toggleTheme}
                                style={{
                                    ...buttonStyle,
                                    background: isDarkMode ? 'var(--accent-primary)' : 'var(--card-bg)',
                                    color: isDarkMode ? 'white' : 'var(--text-primary)'
                                }}
                            >
                                {isDarkMode ? '🌙 Ativado' : '☀️ Desativado'}
                            </button>
                        </div>
                    </section>

                    <section style={{
                        background: 'var(--card-bg)',
                        border: '1px solid var(--card-border)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)'
                    }}>
                        <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Preferências de Pesquisa</h2>
                        
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Região Predefinida</h3>
                                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Filtrar automaticamente pelo teu campeonato regional.
                                </p>
                            </div>
                            
                            <select 
                                value={defaultRegiao}
                                onChange={(e) => updateDefaultRegiao(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="Todas">Nenhuma (Todas as Regiões)</option>
                                <option value="AC Minho">AC Minho</option>
                                <option value="AC Porto">AC Porto</option>
                                <option value="AC Vila Real">AC Vila Real</option>
                                <option value="AC Beira Litoral">AC Beira Litoral</option>
                                <option value="AC Beira Alta">AC Beira Alta</option>
                                <option value="AC Beira Interior">AC Beira Interior</option>
                                <option value="AC Santarém">AC Santarém</option>
                                <option value="AC Setúbal">AC Setúbal</option>
                                <option value="AC Algarve">AC Algarve</option>
                                <option value="AC Madeira">AC Madeira</option>
                                <option value="AC Açores">AC Açores</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Escalão por Defeito</h3>
                                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Pré-seleciona o teu escalão ao abrir o calendário.
                                </p>
                            </div>
                            
                            <select 
                                value={defaultEscalao}
                                onChange={(e) => updateDefaultEscalao(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="Todos">Nenhum (Todos)</option>
                                <option value="Elite Amador / Individual">Elite Amador / Individual</option>
                                <option value="Elite / Sub-23">Elite / Sub-23</option>
                                <option value="Sub-23">Sub-23</option>
                                <option value="Sub-19 (Juniores)">Sub-19 (Juniores)</option>
                                <option value="Sub-17 (Cadetes)">Sub-17 (Cadetes)</option>
                                <option value="Sub-15 (Juvenis)">Sub-15 (Juvenis)</option>
                                <option value="Masters / Veteranos">Masters / Veteranos</option>
                                <option value="Femininas">Femininas</option>
                                <option value="Escolas">Escolas</option>
                            </select>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1.5rem', paddingBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Filtro de Mês Dinâmico</h3>
                                <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Ocultar eventos dos meses passados.
                                </p>
                            </div>
                            
                            <button 
                                onClick={toggleUseCurrentMonth}
                                style={{
                                    ...buttonStyle,
                                    background: useCurrentMonth ? 'var(--accent-primary)' : 'var(--card-bg)',
                                    color: useCurrentMonth ? 'white' : 'var(--text-primary)'
                                }}
                            >
                                {useCurrentMonth ? '✓ Ativado' : '✗ Desativado'}
                            </button>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', paddingTop: '1.5rem', gap: '1rem', flexWrap: 'wrap' }}>
                            <div style={{ flex: 1, minWidth: '200px' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Sites a Pesquisar</h3>
                                <p style={{ margin: '0.25rem 0 1rem', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                    Seleciona os sites.
                                </p>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0, minWidth: '220px' }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedSources.includes('FPC')}
                                        onChange={() => toggleSource('FPC')}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                                    />
                                    FPC (Federação de Ciclismo)
                                </label>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)' }}>
                                    <input 
                                        type="checkbox" 
                                        checked={selectedSources.includes('Cabreira')}
                                        onChange={() => toggleSource('Cabreira')}
                                        style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                                    />
                                    Cabreira Solutions
                                </label>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Coluna Direita: Assistentes */}
                <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    
                    <section style={{
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
                                            Guardar Região
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>

                    <section style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--card-border)',
                        padding: '2rem',
                        borderRadius: 'var(--radius-lg)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            <span style={{ fontSize: '1.5rem' }}>🧮</span>
                            <h2 style={{ margin: 0, color: 'var(--text-primary)', fontSize: '1.3rem' }}>Assistente de Escalão</h2>
                        </div>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                            Calculamos o teu escalão oficial da FPC com base nos teus dados.
                        </p>
                        
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Ano de Nascimento</label>
                                <input 
                                    type="number" 
                                    placeholder="Ex: 1990"
                                    value={birthYear}
                                    onChange={e => setBirthYear(e.target.value)}
                                    style={{ ...selectStyle, width: '100%', maxWidth: 'none' }}
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Género</label>
                                    <select 
                                        value={gender} 
                                        onChange={e => setGender(e.target.value)}
                                        style={{ ...selectStyle, width: '100%', minWidth: '0' }}
                                    >
                                        <option value="M">Masculino</option>
                                        <option value="F">Feminino</option>
                                    </select>
                                </div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1 }}>
                                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Licença</label>
                                    <select 
                                        value={licenseType} 
                                        onChange={e => setLicenseType(e.target.value)}
                                        style={{ ...selectStyle, width: '100%', minWidth: '0' }}
                                    >
                                        <option value="Competição">Competição</option>
                                        <option value="CPT">CPT / Lazer</option>
                                    </select>
                                </div>
                            </div>
                            
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Nível / Equipa</label>
                                <select 
                                    value={teamLevel} 
                                    onChange={e => setTeamLevel(e.target.value)}
                                    style={{ ...selectStyle, width: '100%', maxWidth: 'none' }}
                                >
                                    <option value="Clube">Equipa de Clube / Amadora</option>
                                    <option value="Profissional">Equipa Profissional (Continental / WT)</option>
                                    <option value="Individual">Individual (Sem Equipa)</option>
                                </select>
                            </div>

                            <button 
                                onClick={calculateEscalao}
                                style={{
                                    ...buttonStyle, 
                                    background: 'var(--card-bg)',
                                    color: 'var(--text-primary)',
                                    width: '100%',
                                    marginTop: '0.5rem'
                                }}
                            >
                                Calcular Escalão
                            </button>

                            {escalaoMessage && (
                                <div style={{ 
                                    padding: '0.75rem', 
                                    background: 'var(--card-bg)', 
                                    borderLeft: `4px solid ${suggestedEscalao ? 'var(--accent-primary)' : 'orange'}`,
                                    borderRadius: '4px',
                                    marginTop: '0.5rem',
                                    fontSize: '0.9rem',
                                    color: 'var(--text-primary)',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '0.5rem'
                                }}>
                                    <span>{escalaoMessage}</span>
                                    {suggestedEscalao && (
                                        <button 
                                            onClick={applyEscalao}
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
                                            Guardar Escalão
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>
                    </section>
                </div>
            </main>
        </div>
    );
}
