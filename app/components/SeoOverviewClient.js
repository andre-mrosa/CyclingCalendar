"use client";

import Link from 'next/link';
import { useTranslation } from '../i18n/useTranslation';
import { discoveryCopy } from '../i18n/discoveryCopy';
export const FAQ_DATA = [
    { question: 'O calendário inclui todas as provas de ciclismo?', answer: 'Não garantimos cobertura completa. Reunimos dados básicos das fontes disponíveis. Uma prova pode ainda não estar publicada ou a sua informação pode ter mudado na origem.' },
    { question: 'Como confirmar a data, o local e as inscrições?', answer: 'Abre a ficha da prova e usa a ligação para a fonte. Confirma aí os detalhes antes de te inscreveres ou de planeares uma deslocação. A presença no calendário não confirma vagas nem inscrições abertas.' },
    { question: 'Posso guardar provas e exportar as datas?', answer: 'Podes guardar favoritos e exportar datas para um ficheiro ICS. A exportação não faz a inscrição na prova e um ficheiro descarregado não se atualiza automaticamente.' },
    { question: 'O Cycling Calendar organiza as provas?', answer: 'Não. É um projeto independente de consulta de provas. As ligações para as fontes não significam que exista uma parceria com essas entidades.' },
];
export default function SeoOverviewClient({ disciplines, regions }) {
    const { language } = useTranslation();
    const copy = discoveryCopy[language];
    const faqItems = copy ? copy.faq.map(([question,answer]) => ({question,answer})) : FAQ_DATA;
    const names = ['btt','estrada','gravel','granfondos','ciclocrosse','pista','bmx'];
    return <section className="max-w-7xl mx-auto px-4 sm:px-6 py-12 border-t border-line" aria-labelledby="discovery-heading">
        <h2 id="discovery-heading" className="text-2xl font-bold text-ink">{copy?.heading || 'Explorar provas de ciclismo'}</h2>
        <p className="text-muted mt-3 max-w-3xl leading-relaxed">{copy?.intro || 'Consulta provas por modalidade ou pela classificação regional indicada na fonte. Cada ficha apresenta os dados básicos disponíveis e uma ligação para confirmar os detalhes na origem.'}</p>
        <div className="grid md:grid-cols-2 gap-8 mt-8">
            <nav aria-label={copy?.discipline || 'Provas por modalidade'} className="bg-surface border border-line rounded-2xl p-6">
                <h3 className="font-semibold text-ink mb-4">{copy?.discipline || 'Por modalidade'}</h3>
                <ul className="flex flex-wrap gap-3">{disciplines.map(item => <li key={item.slug}><Link href={'/modalidades/' + item.slug} className="inline-block border border-line rounded-lg px-3 py-2 text-brand">{copy?.names[names.indexOf(item.slug)] || item.name}</Link></li>)}</ul>
            </nav>
            <nav aria-label={copy?.region || 'Provas por classificação regional'} className="bg-surface border border-line rounded-2xl p-6">
                <h3 className="font-semibold text-ink mb-4">{copy?.region || 'Por classificação regional'}</h3>
                <ul className="flex flex-wrap gap-3">{regions.map(item => <li key={item.slug}><Link href={'/regioes/' + item.slug} className="inline-block border border-line rounded-lg px-3 py-2 text-brand">{item.name}</Link></li>)}</ul>
            </nav>
        </div>
        <div className="max-w-4xl mt-12">
            <h2 className="text-2xl font-bold text-ink mb-5">{copy?.help || 'Como utilizar o calendário'}</h2>
            <div className="space-y-3">{faqItems.map(faq => <details key={faq.question} className="p-5 bg-surface border border-line rounded-xl"><summary className="font-semibold text-ink cursor-pointer">{faq.question}</summary><p className="text-muted text-sm leading-relaxed mt-3">{faq.answer}</p></details>)}</div>
        </div>
    </section>;
}
