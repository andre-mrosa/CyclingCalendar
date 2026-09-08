"use client";

import { useState } from 'react';
import { Users } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';
import { translateEscalao } from '../i18n/formatters';

export default function EscalaoAssistant({ onApply }) {
    const { t, language } = useTranslation();
    const [birthYear, setBirthYear] = useState('');
    const [gender, setGender] = useState('M');
    const [licenseType, setLicenseType] = useState('Competição');
    const [teamLevel, setTeamLevel] = useState('Clube');
    const [escalaoMessage, setEscalaoMessage] = useState('');
    const [suggestedEscalao, setSuggestedEscalao] = useState(null);

    const calculateEscalao = () => {
        if (!birthYear || isNaN(birthYear) || birthYear.length !== 4) {
            setEscalaoMessage(t('escalao_invalid_year'));
            setSuggestedEscalao(null);
            return;
        }
        const currentYear = new Date().getFullYear();
        const age = currentYear - parseInt(birthYear);
        
        if (age < 5 || age > 100) {
            setEscalaoMessage(t('escalao_invalid_age'));
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
        setEscalaoMessage(`${t('escalao_detected_title')} ${translateEscalao(result, language)}`);
    };

    const applyEscalao = () => {
        if (suggestedEscalao && onApply) {
            onApply(suggestedEscalao);
            setEscalaoMessage(t('escalao_applied_success'));
            setTimeout(() => {
                setSuggestedEscalao(null);
                setEscalaoMessage('');
                setBirthYear('');
            }, 2000);
        }
    };

    return (
        <div className="bg-surface border border-line rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-6 sm:p-8 relative text-ink transition-colors duration-200">
            <div className="flex items-center gap-3 mb-6">
                <div className="inline-flex shrink-0 items-center justify-center w-12 h-12 rounded-xl bg-brand-soft text-brand">
                    <Users size={23} aria-hidden="true" />
                </div>
                <div>
                    <h2 className="m-0 text-ink text-xl font-bold tracking-tight">{t('escalao_modal_title')}</h2>
                    <p className="text-muted text-xs mt-0.5">{t('escalao_modal_desc')}</p>
                </div>
            </div>
            
            <div className="flex flex-col gap-5">
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">{t('escalao_year_label')}</label>
                    <input 
                        type="number" 
                        placeholder="Ex: 1990"
                        value={birthYear}
                        aria-label={t('escalao_year_label')}
                        onChange={e => setBirthYear(e.target.value)}
                        className="w-full py-3 px-4 rounded-xl border border-line bg-soft text-ink text-sm outline-none focus:border-blue-500 transition-colors shadow-inner"
                    />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">{t('escalao_gender_label')}</label>
                        <select 
                            value={gender} 
                            aria-label={t('escalao_gender_label')}
                            onChange={e => setGender(e.target.value)}
                            className="w-full py-3 px-4 rounded-xl border border-line bg-soft text-ink text-sm outline-none focus:border-blue-500 transition-colors shadow-inner font-medium cursor-pointer"
                        >
                            <option value="M">{t('escalao_gender_male')}</option>
                            <option value="F">{t('escalao_gender_female')}</option>
                        </select>
                    </div>
                    <div className="flex flex-col gap-2">
                        <label className="text-xs font-bold text-muted uppercase tracking-wider">{t('escalao_license_type')}</label>
                        <select 
                            value={licenseType} 
                            aria-label={t('escalao_license_type')}
                            onChange={e => setLicenseType(e.target.value)}
                            className="w-full py-3 px-4 rounded-xl border border-line bg-soft text-ink text-sm outline-none focus:border-blue-500 transition-colors shadow-inner font-medium cursor-pointer"
                        >
                            <option value="Competição">{t('escalao_license_competition')}</option>
                            <option value="CPT">{t('escalao_license_cpt')}</option>
                        </select>
                    </div>
                </div>
                
                <div className="flex flex-col gap-2">
                    <label className="text-xs font-bold text-muted uppercase tracking-wider">{t('escalao_team_level')}</label>
                    <select 
                        value={teamLevel} 
                        aria-label={t('escalao_team_level')}
                        onChange={e => setTeamLevel(e.target.value)}
                        className="w-full py-3 px-4 rounded-xl border border-line bg-soft text-ink text-sm outline-none focus:border-blue-500 transition-colors shadow-inner font-medium cursor-pointer"
                    >
                        <option value="Clube">{t('escalao_team_club')}</option>
                        <option value="Profissional">{t('escalao_team_pro')}</option>
                        <option value="Individual">{t('escalao_team_indiv')}</option>
                    </select>
                </div>

                <button 
                    onClick={calculateEscalao}
                    className="w-full py-3.5 px-4 rounded-xl bg-brand hover:brightness-110 text-surface font-semibold shadow-sm transition-colors text-sm mt-1 cursor-pointer"
                >
                    {t('escalao_btn_calc')}
                </button>

                {escalaoMessage && (
                    <div className={`p-4 bg-soft border rounded-xl mt-2 text-sm text-ink flex flex-col gap-3 shadow-lg ${suggestedEscalao ? 'border-blue-500/40' : 'border-amber-500/40'}`}>
                        <span className="font-medium text-ink">{escalaoMessage}</span>
                        {suggestedEscalao && (
                            <button 
                                onClick={applyEscalao}
                                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-semibold text-sm transition-colors shadow-md cursor-pointer"
                            >
                                {t('escalao_btn_apply')} ({translateEscalao(suggestedEscalao, language)})
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
