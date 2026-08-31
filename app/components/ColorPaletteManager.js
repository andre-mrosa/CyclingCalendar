'use client';
import { useEffect } from 'react';
import { useSettingsStore } from '../store/useSettingsStore';
import { normalizePalette } from '../lib/colorPalettes';

export default function ColorPaletteManager() {
    useEffect(() => {
        const apply = state => {
            document.documentElement.dataset.palette = normalizePalette(state.colorPalette);
        };
        apply(useSettingsStore.getState());
        return useSettingsStore.subscribe(apply);
    }, []);
    return null;
}
