import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const DEFAULT_TABS = ['Geral', 'Minha Agenda', 'Nacionais', 'Internacionais', 'Taças', 'Regionais', 'Lazer', 'Favoritos'];

export const DEFAULT_SOURCES = ['FPC', 'Cabreira', 'Stop and Go'];

export const useSettingsStore = create(
    persist(
        (set) => ({
            defaultPage: '/',
            defaultEscalao: 'Todos',
            defaultRegiao: 'Todas',
            selectedSources: DEFAULT_SOURCES,
            hiddenTabs: [],
            tabsOrder: DEFAULT_TABS,

            setDefaultPage: (val) => set({ defaultPage: val }),
            setDefaultEscalao: (val) => set({ defaultEscalao: val }),
            setDefaultRegiao: (val) => set({ defaultRegiao: val }),
            
            toggleSource: (source) => set((state) => {
                const current = state.selectedSources || [];
                const newSources = current.includes(source)
                    ? current.filter(s => s !== source)
                    : [...current, source];
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
            onRehydrateStorage: () => (state) => {
                if (state && Array.isArray(state.selectedSources)) {
                    // Auto-migrate to include Stop and Go if not present
                    if (!state.selectedSources.includes('Stop and Go')) {
                        state.selectedSources = [...state.selectedSources, 'Stop and Go'];
                    }
                }
            }
        }
    )
);
