"use client";

import { createContext, useState, useEffect } from 'react';

export const SettingsContext = createContext();

export function SettingsProvider({ children }) {
    const [defaultEscalao, setDefaultEscalao] = useState('Todos');
    const [defaultRegiao, setDefaultRegiao] = useState('Todas');
    const [useCurrentMonth, setUseCurrentMonth] = useState(false);
    const [selectedSources, setSelectedSources] = useState(['FPC', 'Cabreira']);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // next-themes handles the theme now, we only load other settings

        const savedEscalao = localStorage.getItem('defaultEscalao');
        if (savedEscalao) setDefaultEscalao(savedEscalao);

        const savedRegiao = localStorage.getItem('defaultRegiao');
        if (savedRegiao) setDefaultRegiao(savedRegiao);

        const savedMonthSetting = localStorage.getItem('useCurrentMonth');
        if (savedMonthSetting) setUseCurrentMonth(savedMonthSetting === 'true');

        const savedSources = localStorage.getItem('selectedSources');
        if (savedSources) {
            try {
                setSelectedSources(JSON.parse(savedSources));
            } catch(e) {}
        }
    }, []);

    const updateDefaultEscalao = (val) => {
        setDefaultEscalao(val);
        localStorage.setItem('defaultEscalao', val);
    };

    const updateDefaultRegiao = (val) => {
        setDefaultRegiao(val);
        localStorage.setItem('defaultRegiao', val);
    };

    const toggleUseCurrentMonth = () => {
        const newVal = !useCurrentMonth;
        setUseCurrentMonth(newVal);
        localStorage.setItem('useCurrentMonth', newVal.toString());
    };

    const toggleSource = (source) => {
        let newSources;
        if (selectedSources.includes(source)) {
            newSources = selectedSources.filter(s => s !== source);
        } else {
            newSources = [...selectedSources, source];
        }
        setSelectedSources(newSources);
        localStorage.setItem('selectedSources', JSON.stringify(newSources));
    };
    const reorderSources = (newOrder) => {
        setSelectedSources(newOrder);
        localStorage.setItem('selectedSources', JSON.stringify(newOrder));
    };

    return (
        <SettingsContext.Provider value={{ 
            defaultEscalao, updateDefaultEscalao,
            defaultRegiao, updateDefaultRegiao,
            useCurrentMonth, toggleUseCurrentMonth,
            selectedSources, toggleSource, reorderSources
        }}>
            {!mounted ? <div style={{ visibility: 'hidden' }}>{children}</div> : children}
        </SettingsContext.Provider>
    );
}
