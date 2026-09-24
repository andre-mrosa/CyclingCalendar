import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { DEFAULT_PALETTE, SETTINGS_STORAGE_KEY, normalizePalette } from '../lib/colorPalettes.js';
import { CALENDAR_SOURCES } from '../lib/calendarSources.js';

export const DEFAULT_TABS = ['Geral', 'Minha Agenda', 'Nacionais', 'Internacionais', 'Taças', 'Regionais', 'Lazer', 'Favoritos'];

export const DEFAULT_SOURCES = CALENDAR_SOURCES;

export const useSettingsStore = create(
    persist(
        (set) => ({
            colorPalette: DEFAULT_PALETTE,
            setColorPalette: (value) => set({ colorPalette: normalizePalette(value) }),
            defaultPage: '/',
            defaultEscalao: 'Todos',
            defaultRegiao: 'Todas',
            language: null, // null means auto-detect from device
            selectedSources: DEFAULT_SOURCES,
            hiddenTabs: [],
            tabsOrder: DEFAULT_TABS,
            homeLocation: null, // { lat, lng, label }
            maxDistanceFilter: null, // number in km, e.g., 50, 100

            setDefaultPage: (val) => set({ defaultPage: val }),
            setDefaultEscalao: (val) => set({ defaultEscalao: val }),
            setDefaultRegiao: (val) => set({ defaultRegiao: val }),
            setLanguage: (val) => set({ language: val }),
            setHomeLocation: (val) => set({ homeLocation: val }),
            setMaxDistanceFilter: (val) => set({ maxDistanceFilter: val }),
            
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
            name: SETTINGS_STORAGE_KEY,
            version: 1,
            migrate: (state) => {
                const previousDefault = ['FPC', 'Cabreira', 'Stop and Go', 'Classificações.net'];
                const selected = state.selectedSources;
                // Upgrade the old default once, preserving deliberately selected subsets.
                return { ...state, selectedSources: !selected || (selected.length === previousDefault.length && previousDefault.every(source => selected.includes(source))) ? CALENDAR_SOURCES : selected };
            }
        }
    )
);
