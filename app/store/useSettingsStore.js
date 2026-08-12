import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useSettingsStore = create(
    persist(
        (set) => ({
            defaultEscalao: 'Todos',
            defaultRegiao: 'Todas',
            useCurrentMonth: false,
            selectedSources: ['FPC', 'Cabreira'],

            setDefaultEscalao: (val) => set({ defaultEscalao: val }),
            setDefaultRegiao: (val) => set({ defaultRegiao: val }),
            
            toggleUseCurrentMonth: () => set((state) => ({ 
                useCurrentMonth: !state.useCurrentMonth 
            })),
            
            toggleSource: (source) => set((state) => {
                const newSources = state.selectedSources.includes(source)
                    ? state.selectedSources.filter(s => s !== source)
                    : [...state.selectedSources, source];
                return { selectedSources: newSources };
            }),

            reorderSources: (newOrder) => set({ selectedSources: newOrder })
        }),
        {
            name: 'cycling-calendar-settings', // unique name in localStorage
        }
    )
);
