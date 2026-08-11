"use client";

import { useState } from 'react';

export default function EscalaoAssistant({ onApply }) {
    const [birthYear, setBirthYear] = useState('');
    const [gender, setGender] = useState('M');
    const [licenseType, setLicenseType] = useState('Competição');
    const [teamLevel, setTeamLevel] = useState('Clube');
    const [escalaoMessage, setEscalaoMessage] = useState('');
    const [suggestedEscalao, setSuggestedEscalao] = useState(null);

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
                if (teamLevel === 'Profissional') result = 'Elite / Sub-23';
                else result = 'Masters / Veteranos';
            }
        }
        
        setSuggestedEscalao(result);
        setEscalaoMessage(`Resultado: ${result}`);
    };

    const applyEscalao = () => {
        if (suggestedEscalao && onApply) {
            onApply(suggestedEscalao);
            setEscalaoMessage("Escalão aplicado com sucesso!");
            setTimeout(() => {
                setSuggestedEscalao(null);
                setEscalaoMessage('');
                setBirthYear('');
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
                                Aplicar {suggestedEscalao}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
