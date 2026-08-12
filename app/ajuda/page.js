"use client";

import { useSettingsStore } from '../store/useSettingsStore';
import RegionAssistant from '../components/RegionAssistant';
import EscalaoAssistant from '../components/EscalaoAssistant';

export default function Ajuda() {
    const { setDefaultRegiao, setDefaultEscalao } = useSettingsStore();

    const handleApply = (type, val) => {
        if (type === 'regiao') {
            setDefaultRegiao(val);
        } else {
            setDefaultEscalao(val);
        }
    };

    return (
        <div className="app-container" style={{ padding: '2rem' }}>
            <header style={{ marginBottom: '2rem', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>Central de Ajuda</h1>
                <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>
                    Usa os nossos assistentes para descobrir a tua associação ou calcular o teu escalão oficial.
                </p>
            </header>

            <main style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))',
                gap: '2rem',
                maxWidth: '1000px',
                margin: '0 auto'
            }}>
                <RegionAssistant onApply={(val) => handleApply('regiao', val)} />
                <EscalaoAssistant onApply={(val) => handleApply('escalao', val)} />
            </main>
        </div>
    );
}
