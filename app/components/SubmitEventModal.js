"use client";

import { useState } from 'react';
import { X, Send, CheckCircle2, Calendar, MapPin, Globe, Mail, Bike, FileText } from 'lucide-react';
import { useTranslation } from '../i18n/useTranslation';

export default function SubmitEventModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        eventName: '',
        date: '',
        discipline: 'Estrada',
        location: '',
        website: '',
        regulations: '',
        contactEmail: '',
        notes: ''
    });
    const [status, setStatus] = useState('idle'); // 'idle' | 'sending' | 'success' | 'error'
    const [errorMessage, setErrorMessage] = useState('');

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.eventName || !formData.date || !formData.contactEmail) {
            setErrorMessage('Por favor preenche pelo menos o nome da prova, a data e o email de contacto.');
            return;
        }

        setStatus('sending');
        setErrorMessage('');

        try {
            const res = await fetch('/api/contact', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    subject: `[Submissão de Prova] ${formData.eventName}`,
                    name: `Organizador / Utilizador (${formData.contactEmail})`,
                    email: formData.contactEmail,
                    message: `NOVA PROVA SUBMETIDA:
Nome da Prova: ${formData.eventName}
Data: ${formData.date}
Modalidade: ${formData.discipline}
Localidade / Distrito: ${formData.location || 'Não indicada'}
Website / Inscrições: ${formData.website || 'Não indicado'}
Regulamento: ${formData.regulations || 'Não indicado'}
Observações: ${formData.notes || 'Nenhuma'}`
                })
            });

            if (res.ok) {
                setStatus('success');
            } else {
                setStatus('error');
                setErrorMessage('Ocorreu um erro ao submeter o formulário. Podes enviar-nos diretamente para contacto@cyclingcalendar.pt');
            }
        } catch (err) {
            setStatus('error');
            setErrorMessage('Erro de ligação. Por favor tenta novamente.');
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div 
                className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 sm:p-8 text-slate-100 max-h-[90vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
            >
                <button 
                    onClick={onClose}
                    className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                    aria-label="Fechar"
                >
                    <X size={20} />
                </button>

                {status === 'success' ? (
                    <div className="py-8 text-center flex flex-col items-center">
                        <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4">
                            <CheckCircle2 size={36} />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-2">Prova Submetida com Sucesso!</h3>
                        <p className="text-slate-300 text-sm max-w-md mx-auto mb-6">
                            Obrigado pela tua contribuição! A nossa equipa irá validar os dados e adicionar o evento ao calendário oficial o mais breve possível.
                        </p>
                        <button 
                            onClick={onClose}
                            className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold text-sm transition-all cursor-pointer"
                        >
                            Fechar
                        </button>
                    </div>
                ) : (
                    <>
                        <div className="mb-6">
                            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
                                <Bike size={14} /> Feito para a comunidade
                            </div>
                            <h2 className="text-2xl font-black text-white tracking-tight">Submeter Prova</h2>
                            <p className="text-slate-400 text-xs sm:text-sm mt-1">
                                Organizas uma prova ou reparaste num evento em falta? Partilha os detalhes connosco.
                            </p>
                        </div>

                        {errorMessage && (
                            <div className="mb-4 p-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 text-xs">
                                {errorMessage}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                                    Nome da Prova / Evento *
                                </label>
                                <input 
                                    type="text" 
                                    required
                                    placeholder="Ex: Granfondo Serra da Estrela, Taça de Portugal XCO..." 
                                    value={formData.eventName}
                                    onChange={(e) => setFormData({ ...formData, eventName: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none placeholder:text-slate-500 transition-all"
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Calendar size={13} className="text-emerald-400" /> Data *
                                    </label>
                                    <input 
                                        type="text" 
                                        required
                                        placeholder="Ex: 17 Maio 2026" 
                                        value={formData.date}
                                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none placeholder:text-slate-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Bike size={13} className="text-emerald-400" /> Modalidade
                                    </label>
                                    <select 
                                        value={formData.discipline}
                                        onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none transition-all cursor-pointer"
                                    >
                                        <option value="Estrada">Estrada</option>
                                        <option value="BTT">BTT (XCM / XCO / DHI)</option>
                                        <option value="Gravel">Gravel</option>
                                        <option value="Granfondo">Granfondo</option>
                                        <option value="Cicloturismo">Cicloturismo / Lazer</option>
                                        <option value="Pista">Pista</option>
                                        <option value="BMX">BMX</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <MapPin size={13} className="text-emerald-400" /> Localidade / Região
                                    </label>
                                    <input 
                                        type="text" 
                                        placeholder="Ex: Manteigas, Guarda" 
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none placeholder:text-slate-500 transition-all"
                                    />
                                </div>

                                <div>
                                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                        <Mail size={13} className="text-emerald-400" /> O Teu Email *
                                    </label>
                                    <input 
                                        type="email" 
                                        required
                                        placeholder="email@exemplo.com" 
                                        value={formData.contactEmail}
                                        onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
                                        className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none placeholder:text-slate-500 transition-all"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <Globe size={13} className="text-emerald-400" /> Link do Evento ou Inscrições
                                </label>
                                <input 
                                    type="url" 
                                    placeholder="https://..." 
                                    value={formData.website}
                                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none placeholder:text-slate-500 transition-all"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                                    <FileText size={13} className="text-emerald-400" /> Observações ou Regulamento
                                </label>
                                <textarea 
                                    rows={2}
                                    placeholder="Distâncias, altimetria, organizador ou link do regulamento..." 
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm text-white outline-none placeholder:text-slate-500 transition-all resize-none"
                                />
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-3">
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={status === 'sending'}
                                    className="px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-slate-950 font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                                >
                                    <Send size={14} />
                                    {status === 'sending' ? 'A enviar...' : 'Enviar Prova'}
                                </button>
                            </div>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
