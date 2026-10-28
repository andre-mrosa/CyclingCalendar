import Link from 'next/link';
import { Bike, Trophy, MapPin, Calendar, HelpCircle, ArrowRight } from 'lucide-react';
import { jsonLd } from '../lib/seo';

export const FAQ_DATA = [
    {
        question: 'Onde posso consultar o calendário completo de provas de ciclismo em Portugal para 2026?',
        answer: 'No Cycling Calendar encontras a agregação independente de todas as provas de ciclismo em Portugal para a época de 2026, incluindo provas de estrada, maratonas BTT (XCM), cross-country (XCO), downhill (DHI), gravel, granfondos e cicloturismo de lazer organizadas pela FPC e entidades parceiras.'
    },
    {
        question: 'Qual a diferença entre Taça de Portugal, Campeonatos Nacionais e Provas Abertas?',
        answer: 'Os Campeonatos Nacionais são a prova rainha anual que atribui a camisola de campeão nacional em cada categoria. A Taça de Portugal é um circuito de várias etapas disputadas ao longo do ano com pontuação acumulada. As Provas Abertas (como Granfondos e passeios CPT) são eventos abertos à participação de atletas não federados e federados de lazer.'
    },
    {
        question: 'Como posso fazer a inscrição numa prova de ciclismo?',
        answer: 'No cartão de cada prova do calendário, clica em «Ver original ↗» ou no botão de ligação oficial. Serás encaminhado diretamente para o portal da entidade oficial responsável pelas inscrições (como a Federação Portuguesa de Ciclismo, Apedalar, Cabreira Solutions, Stop and Go ou Recorde Pessoal).'
    },
    {
        question: 'É possível sincronizar as provas com o Google Calendar ou telemóvel?',
        answer: 'Sim. Em cada prova podes clicar no botão de adicionar ao calendário para criar o evento no teu Google Calendar ou descarregar um ficheiro .ICS compatível com Apple Calendar e Outlook. Se iniciares sessão, podes ainda subscrever o feed de calendário completo com todas as tuas provas favoritas.'
    },
    {
        question: 'Como pesquisar provas de ciclismo por região ou distrito?',
        answer: 'Utiliza os filtros rápidos no topo do calendário. Podes filtrar diretamente por distrito (ex.: Braga, Porto, Viseu, Faro), por região (Norte, Centro, Lisboa e Vale do Tejo, Alentejo, Algarve, Açores e Madeira) ou por modalidade desportiva.'
    }
];

export default function SeoOverviewSection() {
    const faqSchema = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQ_DATA.map(faq => ({
            '@type': 'Question',
            name: faq.question,
            acceptedAnswer: {
                '@type': 'Answer',
                text: faq.answer
            }
        }))
    };

    return (
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 border-t border-line mt-12" aria-labelledby="seo-guide-heading">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: jsonLd(faqSchema) }}
            />

            {/* Quick Category Pillars */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-16">
                <Link
                    href="/nacionais"
                    className="p-5 bg-surface border border-line rounded-2xl hover:border-brand transition-colors group flex flex-col justify-between"
                >
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
                            <Trophy size={20} />
                        </div>
                        <h3 className="font-bold text-ink text-base mb-1 group-hover:text-brand transition-colors">
                            Campeonatos Nacionais
                        </h3>
                        <p className="text-xs text-muted leading-relaxed">
                            A prova máxima do ciclismo português. Vê quem veste a camisola das quinas em Estrada, BTT e Pista.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-4">
                        Ver campeonatos <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                </Link>

                <Link
                    href="/tacas"
                    className="p-5 bg-surface border border-line rounded-2xl hover:border-brand transition-colors group flex flex-col justify-between"
                >
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-brand flex items-center justify-center mb-4">
                            <Calendar size={20} />
                        </div>
                        <h3 className="font-bold text-ink text-base mb-1 group-hover:text-brand transition-colors">
                            Taça de Portugal
                        </h3>
                        <p className="text-xs text-muted leading-relaxed">
                            O troféu por etapas da Federação Portuguesa de Ciclismo. Etapas de XCO, XCM, Estrada e DHI.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-4">
                        Ver etapas da Taça <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                </Link>

                <Link
                    href="/lazer"
                    className="p-5 bg-surface border border-line rounded-2xl hover:border-brand transition-colors group flex flex-col justify-between"
                >
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center mb-4">
                            <Bike size={20} />
                        </div>
                        <h3 className="font-bold text-ink text-base mb-1 group-hover:text-brand transition-colors">
                            Granfondos & Lazer
                        </h3>
                        <p className="text-xs text-muted leading-relaxed">
                            Provas Abertas, Granfondos míticos, Meiofondos e passeios de cicloturismo abertos a todos os entusiastas.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-4">
                        Ver Granfondos <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                </Link>

                <Link
                    href="/regionais"
                    className="p-5 bg-surface border border-line rounded-2xl hover:border-brand transition-colors group flex flex-col justify-between"
                >
                    <div>
                        <div className="w-10 h-10 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-4">
                            <MapPin size={20} />
                        </div>
                        <h3 className="font-bold text-ink text-base mb-1 group-hover:text-brand transition-colors">
                            Provas Regionais
                        </h3>
                        <p className="text-xs text-muted leading-relaxed">
                            Calendários das associações regionais: Minho, Porto, Beiras, Santarém, Setúbal, Algarve e Ilhas.
                        </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand mt-4">
                        Ver regionais <ArrowRight size={12} className="group-hover:translate-x-1 transition-transform" />
                    </span>
                </Link>
            </div>

            {/* Editorial Guide Content */}
            <div className="bg-surface border border-line rounded-3xl p-8 sm:p-10 mb-16">
                <h2 id="seo-guide-heading" className="text-2xl sm:text-3xl font-bold text-ink tracking-tight mb-4">
                    Guia do Calendário de Ciclismo em Portugal 2026
                </h2>
                <p className="text-sm sm:text-base text-muted leading-relaxed mb-6">
                    O <strong>Cycling Calendar</strong> é a plataforma de referência para ciclistas amadores, atletas federados e apaixonados pela modalidade encontrarem todas as informações sobre <strong>provas de ciclismo em Portugal</strong>. O calendário é atualizado de forma contínua a partir de fontes oficiais e organizadores reconhecidos como a <em>Federação Portuguesa de Ciclismo (FPC)</em>, <em>Cabreira Solutions</em>, <em>Apedalar</em>, <em>Stop and Go</em> e <em>Recorde Pessoal</em>.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-line text-xs sm:text-sm text-muted">
                    <div>
                        <h3 className="font-semibold text-ink text-sm sm:text-base mb-2">🚴‍♂️ Ciclismo de Estrada</h3>
                        <p className="leading-relaxed">
                            Desde as grandes provas profissionais e taças federadas aos mais prestigiados <strong>Granfondos e Meiofondos</strong> do país (como o Gerês Granfondo, Coimbra Granfondo, Serra da Estrela e Douro).
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-ink text-sm sm:text-base mb-2">🚵‍♀️ BTT & Downhill</h3>
                        <p className="leading-relaxed">
                            Todas as provas de <strong>Maratonas BTT (XCM)</strong>, Taça de Portugal de <strong>Cross-Country Olímpico (XCO)</strong>, circuitos de <strong>Downhill (DHI)</strong> e Enduro nos melhores trilhos nacionais.
                        </p>
                    </div>
                    <div>
                        <h3 className="font-semibold text-ink text-sm sm:text-base mb-2">🌲 Gravel & Lazer</h3>
                        <p className="leading-relaxed">
                            Provas de <strong>Gravel</strong> em ascensão, provas por etapas, cicloturismo de estrada e eventos CPT («Ciclismo para Todos») acessíveis a participantes sem filiação competitiva.
                        </p>
                    </div>
                </div>
            </div>

            {/* Frequently Asked Questions (FAQ) with Accordion */}
            <div className="max-w-4xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-10 h-10 rounded-xl bg-brand-soft text-brand flex items-center justify-center">
                        <HelpCircle size={22} />
                    </div>
                    <div>
                        <h2 className="text-xl sm:text-2xl font-bold text-ink">Perguntas Frequentes sobre Provas de Ciclismo</h2>
                        <p className="text-xs sm:text-sm text-muted">Tudo o que precisas de saber para planear a tua época desportiva.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {FAQ_DATA.map((faq, index) => (
                        <details
                            key={index}
                            className="group p-5 bg-surface border border-line rounded-2xl cursor-pointer transition-colors open:border-brand-strong/40"
                        >
                            <summary className="font-semibold text-ink text-sm sm:text-base list-none flex items-center justify-between gap-4">
                                <span>{faq.question}</span>
                                <span className="text-muted group-open:rotate-180 transition-transform duration-200 shrink-0 text-xs">
                                    ▼
                                </span>
                            </summary>
                            <p className="text-xs sm:text-sm text-muted leading-relaxed mt-3 pt-3 border-t border-line/60">
                                {faq.answer}
                            </p>
                        </details>
                    ))}
                </div>
            </div>
        </section>
    );
}
