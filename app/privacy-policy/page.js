import { PUBLIC_PAGES, pageMetadata } from '../lib/seo';
import { Shield, Eye, Lock, UserCheck, Database, Globe, Cookie, RefreshCw, Mail, Trash2, KeyRound, Calendar, Ban, Check, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export const metadata = pageMetadata(...PUBLIC_PAGES.find(page => page[0] === '/privacy-policy'));

export default function PrivacyPolicy() {
  const sections = [
    { icon: UserCheck, title: '1. Responsável e contacto', content: <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed"><p>O responsável pelo tratamento dos dados deste projeto é André Rosa. Para questões de privacidade e exercício de direitos, utiliza o formulário de contacto do site, indicando um endereço de resposta. O calendário pode ser consultado sem criar conta.</p><p><Link href="/contacto" className="underline">Formulário de contacto e privacidade</Link></p></div> },
    { icon: Eye, title: '2. Dados e finalidades', content: <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed"><p>Quando crias conta, o Clerk trata os dados de identificação e autenticação, como nome, email, fotografia e identificador. As provas favoritas, preferências de conta e integrações permitem personalizar o serviço. O navegador guarda preferências de interface, pesquisas guardadas. Ao enviares o formulário, tratamos a mensagem e os dados de contacto que forneceres para responder. Os alertas por email estão suspensos.</p></div> },
    { icon: Calendar, title: '3. Integrações e permissões', content: <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed"><p>A integração Google Calendar depende da tua autorização. Pode consultar os calendários disponíveis para localizar ou criar o calendário Cycling Calendar e consultar os registos criados pelo serviço em versões anteriores. A aplicação não utiliza os teus restantes eventos pessoais para publicidade. Podes desligar a integração e revogar as permissões na tua conta Google. Esta versão não incorpora mapas nem consulta distâncias por estrada. Ao abrires as páginas originais das provas, o respetivo fornecedor recebe os dados necessários à ligação.</p></div> },
    { icon: Database, title: '4. Fundamentos e conservação', content: <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed"><p>Os dados necessários à conta e às funcionalidades que solicitas são tratados para prestar o serviço. As integrações e notificações opcionais dependem da tua escolha e podem ser desativadas. Os registos estritamente necessários à segurança e à resolução de falhas servem o interesse legítimo de proteger o serviço. Os dados de conta são conservados enquanto forem necessários à conta; pedidos de eliminação são tratados através dos controlos da conta e do formulário de contacto. Mensagens são conservadas enquanto forem necessárias para responder e acompanhar o pedido. Os dados locais permanecem no navegador até serem removidos nas definições do site ou do navegador, salvo os prazos de cache indicados acima.</p></div> },
    { icon: Globe, title: '5. Fornecedores e partilha', content: <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed"><p>Utilizamos Vercel para alojamento, Clerk para autenticação, Neon/PostgreSQL para a base de dados e Resend para os envios de email quando configurados. Google intervém na consulta da agenda previamente ligada à tua conta. Estes serviços podem implicar tratamento fora do Espaço Económico Europeu; podes pedir informações sobre os destinatários e as garantias aplicáveis através do formulário. Não vendemos dados pessoais nem os cedemos para publicidade de terceiros.</p></div> },
    { icon: Cookie, title: '6. Cookies, armazenamento e estatísticas', content: <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed"><p>A autenticação e proteção contra abuso utilizam cookies do Clerk e da infraestrutura de segurança associada, incluindo cookies com os nomes __client, __client_uat, __cf_bm e _cfuvid. Os nomes podem incluir sufixos técnicos. O armazenamento local permite recordar escolhas como idioma, tema, filtros e favoritos locais. A versão atual do site não ativa o módulo de estatísticas detalhadas de navegação e o respetivo ponto de recolha não grava novos registos. A infraestrutura pode manter registos técnicos de pedidos e falhas. Registos de estatísticas recolhidos por versões anteriores podem incluir identificadores de visitante e sessão, páginas e interações, dispositivo, localização aproximada e associação à conta; não devem ser confundidos com dados totalmente anónimos. Podes pedir acesso ou eliminação dos dados que te digam respeito.</p></div> },
    { icon: Lock, title: '7. Segurança e direitos', content: <div className="space-y-3 text-slate-600 dark:text-slate-400 text-sm leading-relaxed"><p>As ligações ao site usam HTTPS e a autenticação é gerida pelo Clerk. Podes solicitar acesso, retificação, apagamento, limitação, oposição e portabilidade, quando aplicáveis, e retirar consentimentos sem afetar a licitude do tratamento anterior. Podes também apresentar reclamação à Comissão Nacional de Proteção de Dados (CNPD). Respondemos aos pedidos de exercício de direitos sem demora injustificada e, em regra, no prazo de um mês. Quando a lei permitir uma prorrogação, informamos sobre o motivo dentro desse primeiro mês. O exercício destes direitos pode exigir confirmação da identidade para proteger os teus dados. Não utilizamos decisões automatizadas com efeitos jurídicos sobre os utilizadores.</p><p><a href="https://www.cnpd.pt/" className="underline" rel="noopener noreferrer" target="_blank">Comissão Nacional de Proteção de Dados</a></p></div> }
  ];

  return (
    <div className="min-h-screen bg-white dark:bg-[#090d14] text-slate-800 dark:text-slate-200 antialiased selection:bg-emerald-500 selection:text-white py-12 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-emerald-400 transition-colors mb-10 group font-mono">
          <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
          Voltar ao calendário
        </Link>

        <header className="mb-12">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-slate-900 dark:text-white mb-4 tracking-tight">Política de <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Privacidade</span></h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">Clara, direta e sem complicações. A tua privacidade levada a sério.</p>
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
          <p className="text-xs text-slate-500 font-mono mb-4">Última atualização: 30 de setembro de 2026</p>
          <Link href="/contacto" className="inline-flex items-center gap-2 underline text-sm"><Mail size={16} /> Contactar através do formulário</Link>
        </footer>
      </div>
    </div>
  );
}
