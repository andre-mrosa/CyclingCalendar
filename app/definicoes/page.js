"use client";

import { useState } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { HelpCircle, GripVertical } from 'lucide-react';
import RegionAssistant from '../components/RegionAssistant';
import EscalaoAssistant from '../components/EscalaoAssistant';

export default function Conta() {
    const { 
        defaultEscalao, setDefaultEscalao,
        defaultRegiao, setDefaultRegiao,
        useCurrentMonth, toggleUseCurrentMonth,
        selectedSources, toggleSource, reorderSources,
        hiddenTabs, toggleHiddenTab
    } = useSettingsStore();

    const [activeModal, setActiveModal] = useState(null);

    const helpButtonStyle = {
        background: 'none', border: 'none', cursor: 'pointer',
        padding: '0', display: 'flex', alignItems: 'center',
        color: 'var(--accent-primary)', opacity: 0.8,
        transition: 'opacity 0.2s',
        marginLeft: '0.5rem'
    };

    return (
        <div className="app-container" style={{ padding: '2rem' }}>
            <header style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2rem', marginBottom: '0.5rem', fontWeight: 700 }}>Definições</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>
                    Personaliza a tua experiência no Calendário Ciclismo.
                </p>
            </header>

            <main style={{
                display: 'flex', flexDirection: 'column', gap: '2rem',
                maxWidth: '700px', margin: '0 auto'
            }}>
                <section style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0 1.5rem'
                }}>
                    <div className="setting-row">
                        <div className="setting-info">
                            <h3 className="setting-title">
                                Região Predefinida
                                <button onClick={() => setActiveModal('regiao')} style={helpButtonStyle} title="Assistente de Região"><HelpCircle size={16} /></button>
                            </h3>
                            <p className="setting-desc">Filtra automaticamente o calendário pela tua associação regional.</p>
                        </div>
                        <select className="custom-select" value={defaultRegiao} onChange={(e) => setDefaultRegiao(e.target.value)}>
                            <option value="Todas">Nenhuma (Todas)</option>
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

                    <div className="setting-row">
                        <div className="setting-info">
                            <h3 className="setting-title">
                                Escalão Predefinido
                                <button onClick={() => setActiveModal('escalao')} style={helpButtonStyle} title="Assistente de Escalão"><HelpCircle size={16} /></button>
                            </h3>
                            <p className="setting-desc">Mostra as provas mais adequadas à tua categoria ao abrir a página.</p>
                        </div>
                        <select className="custom-select" value={defaultEscalao} onChange={(e) => setDefaultEscalao(e.target.value)}>
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

                    <div className="setting-row">
                        <div className="setting-info">
                            <h3 className="setting-title">Ocultar Eventos Passados</h3>
                            <p className="setting-desc">Inicia o calendário no mês atual, escondendo provas que já decorreram.</p>
                        </div>
                        <div 
                            className={`toggle-switch ${useCurrentMonth ? 'active' : ''}`} 
                            onClick={toggleUseCurrentMonth}
                        />
                    </div>
                </section>

                <section style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0 1.5rem'
                }}>
                    <div style={{ padding: '1.5rem 0 1rem' }}>
                        <h3 className="setting-title" style={{ marginBottom: '0.25rem' }}>Menu de Navegação</h3>
                        <p className="setting-desc">Personaliza os separadores visíveis no topo da página. Desativa o que não usas.</p>
                    </div>
                    
                    <div style={{ paddingBottom: '1rem' }}>
                        {['Nacionais', 'Internacionais', 'Taças', 'Regionais', 'Lazer', 'Favoritos'].map(tab => {
                            const isVisible = !hiddenTabs.includes(tab);
                            return (
                                <div key={tab} className="setting-row" style={{ padding: '0.75rem 0', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                                    <span style={{ fontSize: '0.95rem', color: isVisible ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                                        Separador <strong>{tab}</strong>
                                    </span>
                                    <div 
                                        className={`toggle-switch ${isVisible ? 'active' : ''}`} 
                                        onClick={() => toggleHiddenTab(tab)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </section>

                <section style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--card-border)',
                    borderRadius: 'var(--radius-lg)',
                    padding: '0 1.5rem'
                }}>
                    <div style={{ padding: '1.5rem 0 1rem' }}>
                        <h3 className="setting-title" style={{ marginBottom: '0.25rem' }}>Fontes de Dados (Scrapers)</h3>
                        <p className="setting-desc">Gere a origem das provas. Em caso de duplicados, a que está em cima tem prioridade.</p>
                    </div>

                    <div style={{ paddingBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        {selectedSources.map((source, index) => (
                            <div key={source} style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                background: 'var(--card-bg)', padding: '0.75rem 1rem', 
                                borderRadius: 'var(--radius-md)', border: '1px solid var(--card-border)' 
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ color: 'var(--text-secondary)', cursor: 'grab' }} title="Ordem (Arrasta para mudar se tivéssemos drag&drop, ou usa clique duplo/botões)">
                                        <GripVertical size={16} />
                                    </div>
                                    <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>
                                        {source === 'FPC' ? 'Federação Portuguesa (FPC)' : 'Cabreira Solutions'}
                                    </span>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <button 
                                            onClick={() => {
                                                const newOrder = [...selectedSources];
                                                [newOrder[index - 1], newOrder[index]] = [newOrder[index], newOrder[index - 1]];
                                                reorderSources(newOrder);
                                            }}
                                            disabled={index === 0}
                                            style={{ background: 'none', border: 'none', cursor: index === 0 ? 'not-allowed' : 'pointer', opacity: index === 0 ? 0.2 : 0.7, padding: '0 4px', fontSize: '10px', color: 'var(--text-primary)' }}
                                        >▲</button>
                                        <button 
                                            onClick={() => {
                                                const newOrder = [...selectedSources];
                                                [newOrder[index + 1], newOrder[index]] = [newOrder[index], newOrder[index + 1]];
                                                reorderSources(newOrder);
                                            }}
                                            disabled={index === selectedSources.length - 1}
                                            style={{ background: 'none', border: 'none', cursor: index === selectedSources.length - 1 ? 'not-allowed' : 'pointer', opacity: index === selectedSources.length - 1 ? 0.2 : 0.7, padding: '0 4px', fontSize: '10px', color: 'var(--text-primary)' }}
                                        >▼</button>
                                    </div>
                                    <div 
                                        className="toggle-switch active" 
                                        onClick={() => toggleSource(source)}
                                    />
                                </div>
                            </div>
                        ))}

                        {['FPC', 'Cabreira'].filter(s => !selectedSources.includes(s)).map(source => (
                            <div key={source} style={{ 
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between', 
                                background: 'transparent', padding: '0.75rem 1rem', 
                                borderRadius: 'var(--radius-md)', border: '1px dashed var(--card-border)',
                                opacity: 0.6
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ opacity: 0 }}><GripVertical size={16} /></div>
                                    <span style={{ fontSize: '0.95rem' }}>
                                        {source === 'FPC' ? 'Federação Portuguesa (FPC)' : 'Cabreira Solutions'}
                                    </span>
                                </div>
                                <div className="toggle-switch" onClick={() => toggleSource(source)} />
                            </div>
                        ))}
                    </div>
                </section>
            </main>

            {/* Modals */}
            {activeModal && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000, padding: '1rem', backdropFilter: 'blur(4px)'
                }} onClick={(e) => {
                    if (e.target === e.currentTarget) setActiveModal(null);
                }}>
                    <div style={{ 
                        background: 'var(--card-bg)', borderRadius: 'var(--radius-lg)', position: 'relative',
                        maxWidth: '500px', width: '100%', boxShadow: 'var(--shadow-lg)', overflow: 'hidden'
                    }}>
                        <button 
                            onClick={() => setActiveModal(null)}
                            style={{
                                position: 'absolute', top: '10px', right: '10px',
                                background: 'none', border: 'none', fontSize: '1.5rem', color: 'var(--text-secondary)',
                                cursor: 'pointer', zIndex: 10
                            }}
                        >×</button>
                        
                        <div style={{ maxHeight: '90vh', overflowY: 'auto' }}>
                            {activeModal === 'regiao' && <RegionAssistant onApply={(val) => { setDefaultRegiao(val); setActiveModal(null); }} />}
                            {activeModal === 'escalao' && <EscalaoAssistant onApply={(val) => { setDefaultEscalao(val); setActiveModal(null); }} />}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
