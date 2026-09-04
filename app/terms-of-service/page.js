import { Shield, Scale, AlertTriangle, X, RefreshCw, Info, ArrowLeft, Terminal } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Termos de Serviço | Cycling Calendar',
  description: 'Condições de utilização do Cycling Calendar.',
};

export default function TermsOfService() {
  const sections = [
    {
      icon: Info,
      title: '1. Natureza do Serviço',
      content: (
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          O <strong className="text-emerald-400">Cycling Calendar</strong> é um projeto não-comercial, criado e mantido de forma independente com o objetivo único de agregar e facilitar a consulta do calendário de provas de ciclismo em Portugal. <strong className="text-slate-700 dark:text-slate-300">Não somos organizadores</strong>, patrocinadores nem representantes de nenhum dos eventos listados.
        </p>
      ),
    },
    {
      icon: Scale,
      title: '2. Propriedade Intelectual',
      content: (
        <ul className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
          <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div><span>O código-fonte, o design e a interface da plataforma são protegidos por direitos de autor.</span></li>
          <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div><span>Os <strong>dados dos eventos, logótipos e altimetrias</strong> são propriedades intelectuais das respetivas entidades organizadoras (ex: FPC, Cabreira Solutions, Stopandgo) e são apenas apresentados com o intuito de divulgar as provas à comunidade.</span></li>
        </ul>
      ),
    },
    {
      icon: AlertTriangle,
      title: '3. Limitação de Responsabilidade',
      content: (
        <div className="bg-rose-950/20 border border-rose-900/30 rounded-xl p-5 mt-2">
          <p className="text-slate-700 dark:text-slate-300 text-sm mb-3">Na máxima extensão permitida por lei, o Cycling Calendar <strong className="text-rose-400">não se responsabiliza por</strong>:</p>
          <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
            <li className="flex gap-2 items-start"><X size={16} className="text-rose-500 mt-0.5 shrink-0" /><span>Inexatidões nas datas, percursos, ou cancelamentos repentinos de eventos.</span></li>
            <li className="flex gap-2 items-start"><X size={16} className="text-rose-500 mt-0.5 shrink-0" /><span>Falhas na plataforma, indisponibilidade temporária ou perda de dados de perfil.</span></li>
            <li className="flex gap-2 items-start"><X size={16} className="text-rose-500 mt-0.5 shrink-0" /><span>Quaisquer prejuízos (deslocações, estadias, acidentes) resultantes da confiança exclusiva nos dados aqui apresentados. <strong>Valide sempre a informação no site oficial.</strong></span></li>
          </ul>
        </div>
      ),
    },
    {
      icon: Terminal,
      title: '4. Regras de Utilização (Conduta)',
      content: (
        <>
          <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">Ao usar o Cycling Calendar, o utilizador concorda em:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="p-4 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-slate-300 dark:border-slate-800/40">
              <span className="block text-emerald-400 font-bold mb-1">Uso Correto</span>
              <p className="text-slate-600 dark:text-slate-400">Usar a plataforma apenas para fins pessoais ou informativos.</p>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-slate-300 dark:border-slate-800/40">
              <span className="block text-rose-400 font-bold mb-1">Sem Abusos</span>
              <p className="text-slate-600 dark:text-slate-400">Não sobrecarregar os servidores com bots ou extração agressiva de dados (scraping abusivo).</p>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-slate-300 dark:border-slate-800/40">
              <span className="block text-emerald-400 font-bold mb-1">Identidade</span>
              <p className="text-slate-600 dark:text-slate-400">Não tentar fazer-se passar pela administração do site ou pelos organizadores.</p>
            </div>
            <div className="p-4 bg-slate-100 dark:bg-slate-900/40 rounded-xl border border-slate-300 dark:border-slate-800/40">
              <span className="block text-rose-400 font-bold mb-1">Sistemas</span>
              <p className="text-slate-600 dark:text-slate-400">Não explorar ativamente vulnerabilidades de segurança.</p>
            </div>
          </div>
        </>
      ),
    },
    {
      icon: RefreshCw,
      title: '5. Modificações do Serviço',
      content: (
        <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">Sendo um projeto gerido no tempo livre do autor, reservamo-nos o direito de alterar o layout, adicionar/remover funcionalidades, ou mesmo encerrar o site a qualquer momento, sem aviso prévio. Os presentes Termos de Serviço podem também ser atualizados periodicamente.</p>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#090d14] text-slate-800 dark:text-slate-200 antialiased selection:bg-emerald-500 selection:text-white py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-400 transition-colors mb-10 group font-mono">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar ao calendário
        </Link>
        
        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Termos de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Serviço</span></h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">As regras da casa e as condições de utilização da plataforma.</p>
        </header>

        <div className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <section key={index} className="p-6 sm:p-8 bg-slate-50 dark:bg-slate-950/80 rounded-3xl border border-slate-300 dark:border-slate-800/60 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-800 shadow-inner">
                    <Icon size={22} className="text-emerald-400" />
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
          <p className="text-xs text-slate-500 font-mono mb-4">Última atualização: {new Date().toLocaleDateString('pt-PT')}</p>
        </footer>
      </div>
    </div>
  );
}
