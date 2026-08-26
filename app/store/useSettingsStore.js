import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_TABS = ['Geral', 'Minha Agenda', 'Nacionais', 'Internacionais', 'Taças', 'Regionais', 'Lazer', 'Favoritos'];

export const useSettingsStore = create(
    persist(
        (set) => ({
            defaultPage: '/',
            defaultEscalao: 'Todos',
            defaultRegiao: 'Todas',
            selectedSources: ['FPC', 'Cabreira'],
            hiddenTabs: [],
            tabsOrder: DEFAULT_TABS,

            setDefaultPage: (val) => set({ defaultPage: val }),
            setDefaultEscalao: (val) => set({ defaultEscalao: val }),
            setDefaultRegiao: (val) => set({ defaultRegiao: val }),
            
            toggleSource: (source) => set((state) => {
                const newSources = state.selectedSources.includes(source)
                    ? state.selectedSources.filter(s => s !== source)
                    : [...state.selectedSources, source];
                return { selectedSources: newSources };
            }),

            reorderSources: (newOrder) => set({ selectedSources: newOrder }),

            toggleHiddenTab: (tabId) => set((state) => {
                const newHidden = state.hiddenTabs.includes(tabId)
                    ? state.hiddenTabs.filter(t => t !== tabId)
                    : [...state.hiddenTabs, tabId];
                return { hiddenTabs: newHidden };
            }),

            setTabsOrder: (newOrder) => set({ tabsOrder: newOrder }),

            moveTab: (index, direction) => set((state) => {
                const current = state.tabsOrder && state.tabsOrder.length > 0 
                    ? [...state.tabsOrder] 
                    : [...DEFAULT_TABS];
                const targetIndex = index + direction;
                if (targetIndex < 0 || targetIndex >= current.length) return state;
                const [item] = current.splice(index, 1);
                current.splice(targetIndex, 0, item);
                return { tabsOrder: current };
            }),

            resetTabsOrder: () => set({ tabsOrder: [...DEFAULT_TABS] })
        }),
        {
            name: 'cycling-calendar-settings', // unique name in localStorage
        }
    )
);
