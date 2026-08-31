'use client';
import { useId } from 'react';
import { Check, Palette } from 'lucide-react';
import { useSettingsStore } from '../store/useSettingsStore';
import { useTranslation } from '../i18n/useTranslation';
import { COLOR_PALETTES, normalizePalette } from '../lib/colorPalettes';
import styles from './site.module.css';

export default function ColorPalettePicker() {
    const id = useId();
    const { t } = useTranslation();
    const colorPalette = useSettingsStore(state => state.colorPalette);
    const setColorPalette = useSettingsStore(state => state.setColorPalette);
    return (
        <fieldset className={styles.palettePicker} aria-describedby={id}>
            <legend><Palette size={17} aria-hidden="true" />{t('settings_palette_title')}</legend>
            <p id={id}>{t('settings_palette_desc')}</p>
            <div className={styles.paletteGrid}>
                {COLOR_PALETTES.map(p => (
                    <label key={p.id} className={styles.paletteOption}>
                        <input type="radio" name={`color-palette-${id}`} value={p.id}
                            checked={normalizePalette(colorPalette) === p.id}
                            onChange={() => setColorPalette(p.id)} />
                        <span className={styles.paletteCard}>
                            <span className={styles.paletteSwatch} aria-hidden="true">
                                <span style={{ background: p.accent }} /><span style={{ background: p.nightAccent }} />
                            </span>
                            <span className={styles.paletteName}>{t(`settings_palette_${p.id}`)}<Check size={15} aria-hidden="true" /></span>
                        </span>
                    </label>
                ))}
            </div>
        </fieldset>
    );
}
