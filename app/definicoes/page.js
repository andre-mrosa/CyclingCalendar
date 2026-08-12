"use client";

import { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { HelpCircle, ChevronUp, ChevronDown, Check, X } from 'lucide-react';
import RegionAssistant from '../components/RegionAssistant';
import EscalaoAssistant from '../components/EscalaoAssistant';

export default function Conta() {
    const { 
        defaultEscalao, setDefaultEscalao,
        defaultRegiao, setDefaultRegiao,
        useCurrentMonth, toggleUseCurrentMonth,
        selectedSources, toggleSource, reorderSources
    } = useSettingsStore();

    const [activeModal, setActiveModal] = useState(null); // 'regiao' or 'escalao'

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

    const helpButtonStyle = {
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: '1.2rem',
        padding: '0',
        display: 'flex',
        alignItems: 'center',
        opacity: 0.7,
        transition: 'opacity 0.2s',
        color: 'var(--text-primary)'
    };

    return (
        <div className="app-container" style={{ padding: '2rem' }}>
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Definições</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Gere as tuas preferências de visualização.
                </p>
            </header>

            <main style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '2rem',
                maxWidth: '800px',
                margin: '0 auto'
            }}>


                <section style={{
                    background: 'var(--card-bg)',
                    border: '1px solid var(--card-border)',
                    padding: '2rem',
                    borderRadius: 'var(--radius-lg)'
                }}>
                    <h2 style={{ marginBottom: '1.5rem', color: 'var(--text-primary)' }}>Preferências de Pesquisa</h2>
                    
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid var(--card-border)', gap: '1rem', flexWrap: 'wrap' }}>
                        <div style={{ flex: 1, minWidth: '200px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Região Predefinida</h3>
                                <button 
                                    onClick={() => setActiveModal('regiao')} 
                                    style={helpButtonStyle}
                                    title="Ajuda a detetar Região"
                                    onMouseOver={e => e.currentTarget.style.opacity = 1}
                                    onMouseOut={e => e.currentTarget.style.opacity = 0.7}
                                >
                                    <HelpCircle size={18} />
                                </button>
                            </div>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Filtrar automaticamente pelo teu campeonato regional.
                            </p>
                        </div>
                        
                        <select 
                            value={defaultRegiao}
                            onChange={(e) => setDefaultRegiao(e.target.value)}
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
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>Escalão por Defeito</h3>
                                <button 
                                    onClick={() => setActiveModal('escalao')} 
                                    style={helpButtonStyle}
                                    title="Assistente de Escalão"
                                    onMouseOver={e => e.currentTarget.style.opacity = 1}
                                    onMouseOut={e => e.currentTarget.style.opacity = 0.7}
                                >
                                    <HelpCircle size={18} />
                                </button>
                            </div>
                            <p style={{ margin: '0.25rem 0 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                                Pré-seleciona o teu escalão ao abrir o calendário.
                            </p>
                        </div>
                        
                        <select 
                            value={defaultEscalao}
                            onChange={(e) => setDefaultEscalao(e.target.value)}
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
                            {useCurrentMonth ? <><Check size={16} /> Ativado</> : <><X size={16} /> Desativado</>}
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
                            {selectedSources.map((source, index) => (
                                <div key={source} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'var(--bg-secondary)', padding: '0.5rem 0.75rem', borderRadius: '4px', border: '1px solid var(--accent-secondary)' }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={true}
                                            onChange={() => toggleSource(source)}
                                            style={{ width: '18px', height: '18px', accentColor: 'var(--accent-primary)' }}
                                        />
                                        {source === 'FPC' ? 'FPC (Oficial)' : 'Cabreira Solutions'}
                                    </label>
                                    <div style={{ display: 'flex', gap: '0.25rem' }}>
                                        <button 
                                            onClick={() => {
                                                const newOrder = [...selectedSources];
                                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                                reorderSources(newOrder);
                                            }}
                                            disabled={index === 0}
                                            style={{ background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.3 : 1, color: 'var(--text-primary)', padding: '0.2rem' }}
                                            title="Mover para cima (Maior Prioridade)"
                                        >
                                            <ChevronUp size={16} />
                                        </button>
                                        <button 
                                            onClick={() => {
                                                const newOrder = [...selectedSources];
                                                [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                                                reorderSources(newOrder);
                                            }}
                                            disabled={index === selectedSources.length - 1}
                                            style={{ background: 'none', border: 'none', cursor: index === selectedSources.length - 1 ? 'not-allowed' : 'pointer', opacity: index === selectedSources.length - 1 ? 0.3 : 1, color: 'var(--text-primary)', padding: '0.2rem' }}
                                            title="Mover para baixo (Menor Prioridade)"
                                        >
                                            <ChevronDown size={16} />
                                        </button>
                                    </div>
                                </div>
                            ))}

                            {['FPC', 'Cabreira'].filter(s => !selectedSources.includes(s)).map(source => (
                                <div key={source} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', background: 'var(--card-bg)', padding: '0.5rem 0.75rem', borderRadius: '4px', opacity: 0.6 }}>
                                    <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: 'var(--text-primary)', margin: 0, fontSize: '0.95rem' }}>
                                        <input 
                                            type="checkbox" 
                                            checked={false}
                                            onChange={() => toggleSource(source)}
                                            style={{ width: '18px', height: '18px' }}
                                        />
                                        {source === 'FPC' ? 'FPC (Oficial)' : 'Cabreira Solutions'}
                                    </label>
                                </div>
                            ))}
                            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.25rem', fontStyle: 'italic' }}>
                                Usa as setas para definir a prioridade (desduplicação).
                            </p>
                        </div>
                    </div>
                </section>
            </main>

            {/* Modals */}
            {activeModal && (
                <div style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '1rem',
                    backdropFilter: 'blur(4px)'
                }} onClick={(e) => {
                    if (e.target === e.currentTarget) setActiveModal(null);
                }}>
                    <div style={{ 
                        background: 'var(--card-bg)',
                        borderRadius: 'var(--radius-lg)',
                        position: 'relative',
                        maxWidth: '500px',
                        width: '100%',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
                        overflow: 'hidden'
                    }}>
                        <button 
                            onClick={() => setActiveModal(null)}
                            style={{
                                position: 'absolute',
                                top: '10px', right: '10px',
                                background: 'none', border: 'none',
                                fontSize: '1.5rem', color: 'var(--text-secondary)',
                                cursor: 'pointer', zIndex: 10
                            }}
                        >
                            ×
                        </button>
                        
                        <div style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                            {activeModal === 'regiao' && (
                                <RegionAssistant onApply={(val) => {
                                    setDefaultRegiao(val);
                                    setTimeout(() => setActiveModal(null), 1000);
                                }} />
                            )}
                            
                            {activeModal === 'escalao' && (
                                <EscalaoAssistant onApply={(val) => {
                                    setDefaultEscalao(val);
                                    setTimeout(() => setActiveModal(null), 1000);
                                }} />
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
