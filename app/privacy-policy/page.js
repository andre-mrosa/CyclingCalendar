import { Shield, Eye, Lock, UserCheck, Database, Globe, Cookie, RefreshCw, Mail, Trash2, KeyRound, Calendar, Ban, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Política de Privacidade | Cycling Calendar',
  description: 'Como protegemos e tratamos os seus dados no Cycling Calendar.',
};

export default function PrivacyPolicy() {
  const sections = [
    {
      icon: Eye,
      title: '1. Informação que Recolhemos',
      content: (
        <>
          <p className="mb-4 text-slate-300">Quando utiliza o Cycling Calendar, recolhemos os seguintes dados essenciais para o funcionamento da plataforma:</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800/60 shadow-sm">
              <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><KeyRound size={16} className="text-emerald-400" />Login (via Clerk & Google)</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex gap-2 items-start"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /><span>Nome e endereço de e-mail</span></li>
                <li className="flex gap-2 items-start"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /><span>Foto de perfil pública</span></li>
                <li className="flex gap-2 items-start"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /><span>Identificador único de conta</span></li>
              </ul>
            </div>
            <div className="p-5 bg-slate-900/50 rounded-xl border border-slate-800/60 shadow-sm">
              <h4 className="text-white font-bold text-sm mb-3 flex items-center gap-2"><Calendar size={16} className="text-emerald-400" />Integração Google Calendar</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex gap-2 items-start"><Check size={14} className="text-emerald-500 mt-0.5 shrink-0" /><span>Token OAuth (apenas para adicionar provas)</span></li>
                <li className="flex gap-2 items-start"><Ban size={14} className="text-rose-500 mt-0.5 shrink-0" /><span>Não lemos nem apagamos os teus outros eventos pessoais.</span></li>
              </ul>
            </div>
          </div>
        </>
      ),
    },
    {
      icon: Database,
      title: '2. Utilização dos Dados',
      content: (
        <ul className="space-y-3 text-slate-400 text-sm leading-relaxed">
          <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div><span><strong className="text-slate-200 font-semibold">Personalização:</strong> Guardar as tuas provas favoritas e gerir o teu calendário.</span></li>
          <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div><span><strong className="text-slate-200 font-semibold">Comunicação:</strong> Enviar atualizações ou avisos importantes (raramente utilizado).</span></li>
          <li className="flex gap-3"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0"></div><span><strong className="text-slate-200 font-semibold">Estatísticas:</strong> Analisar tráfego de forma anónima para melhorar o site.</span></li>
        </ul>
      ),
    },
    {
      icon: Globe,
      title: '3. Partilha de Dados',
      content: (
        <p className="text-slate-400 text-sm leading-relaxed">O Cycling Calendar <strong className="text-emerald-400">nunca vende, aluga ou partilha</strong> os teus dados pessoais com terceiros para fins de marketing. Os únicos serviços externos envolvidos no processo são a <strong>Vercel</strong> (alojamento), o <strong>Clerk</strong> (gestão de autenticação segura) e a <strong>Supabase</strong> (base de dados), operando todos sob estritas normas de segurança e privacidade.</p>
      ),
    },
    {
      icon: Cookie,
      title: '4. Cookies e Tecnologias Semelhantes',
      content: (
        <p className="text-slate-400 text-sm leading-relaxed">Utilizamos apenas cookies essenciais geridos pelo sistema de autenticação (Clerk) e <code>localStorage</code> para guardar as tuas preferências de interface (filtros, dark mode). Não utilizamos cookies de rastreamento invasivos, pixels do Facebook ou Google Analytics.</p>
      ),
    },
    {
      icon: Lock,
      title: '5. Segurança da Informação',
      content: (
        <p className="text-slate-400 text-sm leading-relaxed">Toda a comunicação com os nossos servidores é encriptada via HTTPS. Não armazenamos palavras-passe no nosso servidor (o login é 100% gerido por OAuth). Caso um token de acesso expire ou seja revogado, o sistema perde imediatamente a autorização para aceder aos recursos integrados.</p>
      ),
    },
    {
      icon: UserCheck,
      title: '6. Os Teus Direitos (RGPD)',
      content: (
        <>
          <p className="text-slate-400 text-sm mb-4">Ao abrigo do RGPD, tens controlo total sobre os teus dados. Podes diretamente na plataforma:</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/40">
              <span className="block text-emerald-400 font-bold mb-1">Aceder</span>
              <span className="text-[11px] text-slate-500">Ver o teu perfil</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/40">
              <span className="block text-emerald-400 font-bold mb-1">Retificar</span>
              <span className="text-[11px] text-slate-500">Alterar dados</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/40">
              <span className="block text-rose-400 font-bold mb-1">Apagar</span>
              <span className="text-[11px] text-slate-500">Direito ao esquecimento</span>
            </div>
            <div className="p-3 bg-slate-900/40 rounded-lg border border-slate-800/40">
              <span className="block text-emerald-400 font-bold mb-1">Revogar</span>
              <span className="text-[11px] text-slate-500">Remover acessos Google</span>
            </div>
          </div>
        </>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-[#090d14] text-slate-200 antialiased selection:bg-emerald-500 selection:text-white py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-emerald-400 transition-colors mb-10 group font-mono">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar ao calendário
        </Link>
        
        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight">Política de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Privacidade</span></h1>
          <p className="text-lg text-slate-400 font-medium">Clara, direta e sem complicações. A tua privacidade levada a sério.</p>
        </header>

        <div className="space-y-6">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <section key={index} className="p-6 sm:p-8 bg-slate-950/80 rounded-3xl border border-slate-800/60 shadow-2xl backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-5">
                  <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 shadow-inner">
                    <Icon size={22} className="text-emerald-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white tracking-tight">{section.title}</h2>
                </div>
                <div className="pl-0 sm:pl-16">
                  {section.content}
                </div>
              </section>
            );
          })}
        </div>

        <footer className="mt-16 text-center border-t border-slate-800/60 pt-8">
          <p className="text-xs text-slate-500 font-mono mb-4">Última atualização: {new Date().toLocaleDateString('pt-PT')}</p>
          <a href="mailto:andre.mrosa@outlook.com" className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-slate-900 border border-slate-800 text-sm font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all shadow-sm">
            <Mail size={16} className="text-emerald-400" /> Contactar o administrador
          </a>
        </footer>
      </div>
    </div>
  );
}
