"use client";
import { useTranslation } from "../i18n/useTranslation";
import { translateLegalText } from "../i18n/legalCopy";
import { Shield, Scale, AlertTriangle, X, RefreshCw, Info, ArrowLeft, Terminal } from 'lucide-react';
import Link from 'next/link';


export default function TermsOfService() {
  const { language } = useTranslation();
  const l = value => translateLegalText(value,language);
  const sections = [
    {
      icon: Info,
      title: l("1. Natureza do Serviço"),
      content: (
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed"> {l("O")} <strong className="text-emerald-700 dark:text-emerald-400">{l("Cycling Calendar")}</strong> {l("é um projeto não-comercial, criado e mantido de forma independente com o objetivo único de agregar e facilitar a consulta do calendário de provas de ciclismo em Portugal.")} <strong className="text-slate-700 dark:text-slate-300">{l("Não somos organizadores")}</strong>{l(", patrocinadores nem representantes de nenhum dos eventos listados.")} </p>
      ),
    },
    {
      icon: Scale,
      title: l("2. Conteúdos e respetivos direitos"),
      content: (
        <ul className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div><span>{l("O Cycling Calendar apresenta um índice de provas com informação factual resumida e ligações para as páginas de origem.")} {l("Datas, classificações e correspondências entre edições podem ser obtidas automaticamente a partir das fontes e podem conter erros ou estar incompletas. Favoritos, filtros e sugestões de escalão não são inscrições nem confirmam a elegibilidade para participar. Confirma sempre datas, regulamento, inscrições e condições junto do organizador. Os emails e as notificações são opcionais; a entrega e a hora de receção dependem também dos fornecedores, da ligação e do dispositivo e não são garantidas.")}</span></li>
          <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div><span>{l("Não disponibilizamos cópias de descrições, cartazes, fotografias, logótipos, altimetrias ou ficheiros de percursos das provas. As ligações externas não implicam afiliação ou aprovação por parte dos organizadores. Para questões de atribuição, correção ou remoção de conteúdos, utilize o")} <Link href="/contacto" className="underline underline-offset-4">{l("formulário de contacto")}</Link>.</span></li>
        </ul>
      ),
    },
    {
      icon: AlertTriangle,
      title: l("3. Limitação de Responsabilidade"),
      content: (
        <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-5 mt-2">
          <p className="text-slate-700 dark:text-slate-300 text-sm mb-3">{l("Na máxima extensão permitida por lei, o Cycling Calendar")} <strong className="text-rose-800 dark:text-rose-400">{l("não se responsabiliza por")}</strong>:</p>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex gap-2 items-start"><X size={16} className="text-rose-500 mt-0.5 shrink-0" /><span>{l("Inexatidões nas datas, percursos, ou cancelamentos repentinos de eventos.")}</span></li>
            <li className="flex gap-2 items-start"><X size={16} className="text-rose-500 mt-0.5 shrink-0" /><span>{l("Falhas na plataforma, indisponibilidade temporária ou perda de dados de perfil.")}</span></li>
            <li className="flex gap-2 items-start"><X size={16} className="text-rose-500 mt-0.5 shrink-0" /><span>{l("Quaisquer prejuízos (deslocações, estadias, acidentes) resultantes da confiança exclusiva nos dados aqui apresentados.")} <strong>{l("Valide sempre a informação no site oficial.")}</strong></span></li>
          </ul>
          <p className="mt-4 text-sm text-slate-600 dark:text-slate-400">{l("Estas limitações não excluem nem restringem responsabilidades ou direitos que a lei não permita afastar, incluindo os direitos de proteção de dados e os direitos dos consumidores quando aplicáveis. Procuramos corrigir informações inexatas quando nos são comunicadas.")}</p>
        </div>
      ),
    },
    {
      icon: Terminal,
      title: l("4. Regras de Utilização (Conduta)"),
      content: (
        <>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">{l("Ao usar o Cycling Calendar, o utilizador concorda em:")}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-slate-300 dark:border-slate-800/40">
              <span className="block text-emerald-700 dark:text-emerald-400 font-bold mb-1">{l("Uso Correto")}</span>
              <p className="text-slate-600 dark:text-slate-400">{l("Usar a plataforma apenas para fins pessoais ou informativos.")}</p>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-slate-300 dark:border-slate-800/40">
              <span className="block text-rose-700 dark:text-rose-400 font-bold mb-1">{l("Consulta Automatizada")}</span>
              <p className="text-slate-600 dark:text-slate-400">{l("É permitida a consulta automatizada e a extração de dados (scraping), com uma frequência de pedidos que não prejudique a disponibilidade do serviço para os restantes utilizadores. Esta permissão não concede direitos sobre conteúdos de terceiros.")}</p>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-slate-300 dark:border-slate-800/40">
              <span className="block text-emerald-700 dark:text-emerald-400 font-bold mb-1">{l("Identidade")}</span>
              <p className="text-slate-600 dark:text-slate-400">{l("Não tentar fazer-se passar pela administração do site ou pelos organizadores.")}</p>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-slate-300 dark:border-slate-800/40">
              <span className="block text-rose-700 dark:text-rose-400 font-bold mb-1">{l("Sistemas")}</span>
              <p className="text-slate-600 dark:text-slate-400">{l("Não explorar ativamente vulnerabilidades de segurança.")}</p>
            </div>
          </div>
        </>
      ),
    },
    {
      icon: RefreshCw,
      title: l("5. Modificações do Serviço"),
      content: (
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">{l("Podemos atualizar o serviço, alterar funcionalidades ou cessar a sua disponibilização. Sempre que possível, alterações relevantes serão comunicadas no site com antecedência razoável. A versão atual dos termos fica disponível nesta página, com a data de atualização. As alterações não afastam direitos imperativos nem validam retroativamente tratamentos de dados que exijam consentimento.")}</p>
      ),
    },
    { icon: Info, title: l("6. Conta, favoritos e funções opcionais"), content: <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400"><p>{l("A consulta do calendário é gratuita e não exige conta. Uma conta permite sincronizar favoritos e gerir integrações. Mantém as credenciais seguras. As funções opcionais são ativadas nos respetivos controlos; usar o site ou aceitar estes termos não substitui o consentimento exigido para estatísticas, emails, notificações ou localização. Os dados pessoais são tratados nos termos da Política de Privacidade.")}</p><Link href="/privacy-policy" className="underline">{l("Política de")} {l("Privacidade")}</Link></div> },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#090d14] text-slate-800 dark:text-slate-200 antialiased selection:bg-emerald-500 selection:text-white py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-400 transition-colors mb-10 group font-mono">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" /> {l("Voltar ao calendário")} </Link>

        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">{l("Termos de")} <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">{l("Serviço")}</span></h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">{l("As regras da casa e as condições de utilização da plataforma.")}</p>
        </header>

        <div className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <section key={index} className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-950/80 rounded-3xl border border-slate-300 dark:border-slate-800/60 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-inner">
                    <Icon size={22} className="text-emerald-700 dark:text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">{section.title}</h2>
                </div>
                <div className="pl-0 sm:pl-16">
                  {section.content}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="mt-16 text-center border-t border-slate-300 dark:border-slate-800/60 pt-8">
          <p className="text-xs text-slate-500 font-mono mb-4">{l("Última atualização: 30 de outubro de 2026")}</p>
        </footer>
      </div>
    </div>
  );
}
