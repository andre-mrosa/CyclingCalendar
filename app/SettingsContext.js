"use client";

import { createContext, useState, useEffect } from 'react';

export const SettingsContext = createContext();

export function SettingsProvider({ children }) {
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [defaultEscalao, setDefaultEscalao] = useState('Todos');
    const [defaultRegiao, setDefaultRegiao] = useState('Todas');
    const [useCurrentMonth, setUseCurrentMonth] = useState(false);
    const [selectedSources, setSelectedSources] = useState(['FPC', 'Cabreira']);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
        setMounted(true);
        // Load Settings from Local Storage
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme) {
            const isDark = savedTheme === 'dark';
            setIsDarkMode(isDark);
            applyTheme(isDark);
        } else if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
            setIsDarkMode(false);
            applyTheme(false);
        } else {
            applyTheme(true);
        }

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

    const applyTheme = (isDark) => {
        if (isDark) {
            document.documentElement.classList.remove('light-mode');
        } else {
            document.documentElement.classList.add('light-mode');
        }
    };

    const toggleTheme = () => {
        const newMode = !isDarkMode;
        setIsDarkMode(newMode);
        applyTheme(newMode);
        localStorage.setItem('theme', newMode ? 'dark' : 'light');
    };

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

    return (
        <SettingsContext.Provider value={{ 
            isDarkMode, toggleTheme,
            defaultEscalao, updateDefaultEscalao,
            defaultRegiao, updateDefaultRegiao,
            useCurrentMonth, toggleUseCurrentMonth,
            selectedSources, toggleSource
        }}>
            {!mounted ? <div style={{ visibility: 'hidden' }}>{children}</div> : children}
        </SettingsContext.Provider>
    );
}
