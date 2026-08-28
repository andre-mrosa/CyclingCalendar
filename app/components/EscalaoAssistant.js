"use client";

import { useState } from 'react';
import { useTranslation } from '../i18n/useTranslation';

export default function EscalaoAssistant({ onApply }) {
    const { t } = useTranslation();
    const [birthYear, setBirthYear] = useState('');
    const [gender, setGender] = useState('M');
    const [licenseType, setLicenseType] = useState('Competição');
    const [teamLevel, setTeamLevel] = useState('Clube');
    const [escalaoMessage, setEscalaoMessage] = useState('');
    const [suggestedEscalao, setSuggestedEscalao] = useState(null);

    const calculateEscalao = () => {
        if (!birthYear || isNaN(birthYear) || birthYear.length !== 4) {
            setEscalaoMessage("Introduz um ano de nascimento válido (ex: 1990).");
            setSuggestedEscalao(null);
            return;
        }
        const currentYear = new Date().getFullYear();
        const age = currentYear - parseInt(birthYear);
        
        if (age < 5 || age > 100) {
            setEscalaoMessage("Idade fora dos limites habituais de competição.");
            setSuggestedEscalao(null);
            return;
        }
        
        let result = '';
        
        if (gender === 'F') {
            result = 'Femininas';
        } else if (licenseType === 'CPT') {
            result = 'Todos (Aberto)'; 
        } else {
            if (age <= 14) result = 'Escolas';
            else if (age <= 16) result = 'Sub-17 (Cadetes)';
            else if (age <= 18) result = 'Sub-19 (Juniores)';
            else if (age <= 22) {
                if (teamLevel === 'Individual') result = 'Elite Amador';
                else result = 'Sub-23';
            }
            else if (age <= 29) {
                if (teamLevel === 'Individual') result = 'Elite Amador';
                else result = 'Elite'; 
            }
            else {
                if (teamLevel === 'Profissional') result = 'Elite';
                else result = 'Masters / Veteranos';
            }
        }
        
        setSuggestedEscalao(result);
        setEscalaoMessage(`${t('escalao_detected_title')} ${result}`);
    };

    const applyEscalao = () => {
        if (suggestedEscalao && onApply) {
            onApply(suggestedEscalao);
            setEscalaoMessage("Escalão aplicado com sucesso!");
            setTimeout(() => {
                setSuggestedEscalao(null);
                setEscalaoMessage('');
                setBirthYear('');
            }, 2000);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative text-slate-900 dark:text-slate-100 transition-colors duration-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20">
                    <span className="text-xl">🧮</span>
                </div>
                <div>
                    <h2 className="m-0 text-slate-900 dark:text-white text-xl font-bold tracking-tight">{t('escalao_modal_title')}</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{t('escalao_modal_desc')}</p>
                </div>
            </div>
            
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('escalao_year_label')}</label>
                    <input 
                        type="number" 
                        placeholder="Ex: 1990"
                        value={birthYear}
                        onChange={e => setBirthYear(e.target.value)}
                        className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors shadow-inner"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('escalao_gender_label')}</label>
                        <select 
                            value={gender} 
                            onChange={e => setGender(e.target.value)}
                            className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors shadow-inner"
                        >
                            <option value="M">{t('escalao_gender_male')}</option>
                            <option value="F">{t('escalao_gender_female')}</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{t('escalao_license_type')}</label>
                        <select 
                            value={licenseType} 
                            onChange={e => setLicenseType(e.target.value)}
                            className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors shadow-inner"
                        >
                            <option value="Competição">{t('escalao_license_competition')}</option>
                            <option value="CPT">{t('escalao_license_cpt')}</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nível / Equipa</label>
                    <select 
                        value={teamLevel} 
                        onChange={e => setTeamLevel(e.target.value)}
                        className="w-full py-3 px-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50 dark:bg-slate-950/60 text-slate-800 dark:text-slate-200 text-sm outline-none focus:border-blue-500 transition-colors shadow-inner"
                    >
                        <option value="Clube">Equipa de Clube / Amadora</option>
                        <option value="Profissional">Equipa Profissional (Continental / WT)</option>
                        <option value="Individual">Individual (Sem Equipa)</option>
                    </select>
                </div>

                <button 
                    onClick={calculateEscalao}
                    className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold shadow-lg shadow-blue-500/20 transition-colors text-sm mt-1 cursor-pointer"
                >
                    {t('escalao_modal_title')}
                </button>

                {escalaoMessage && (
                    <div className={`p-4 bg-slate-50 dark:bg-slate-950/60 border rounded-xl mt-2 text-sm text-slate-800 dark:text-slate-200 flex flex-col gap-3 shadow-lg ${suggestedEscalao ? 'border-blue-500/40' : 'border-amber-500/40'}`}>
                        <span className="font-medium text-slate-800 dark:text-slate-200">{escalaoMessage}</span>
                        {suggestedEscalao && (
                            <button 
                                onClick={applyEscalao}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-md cursor-pointer"
                            >
                                {t('escalao_btn_apply')} ({suggestedEscalao})
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
