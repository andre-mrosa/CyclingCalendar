import { FileText, Shield, AlertTriangle, Scale, RefreshCw, Mail, Calendar } from 'lucide-react';

export const metadata = {
  title: 'Termos de Serviço | Cycling Calendar',
  description: 'Termos de Serviço do Cycling Calendar',
};

export default function TermsOfService() {
  const sections = [
    {
      icon: FileText,
      title: '1. Aceitação dos Termos',
      content: (
        <>
          <p>Ao aceder ou utilizar o Cycling Calendar (doravante "Plataforma"), o utilizador declara ter lido, compreendido e aceite ficar vinculado a estes Termos de Serviço na sua totalidade. Se não concordar com alguma parte dos termos, deve cessar imediatamente a utilização da Plataforma.</p>
          <p className="mt-3">A utilização continuada da Plataforma após a publicação de alterações a estes Termos constitui aceitação tácita das mesmas.</p>
        </>
      ),
    },
    {
      icon: Shield,
      title: '2. Descrição do Serviço',
      content: (
        <ul className="space-y-2">
          <li className="flex gap-2"><span className="text-blue-400 mt-1">•</span><span>O Cycling Calendar é um <strong className="text-slate-200">agregador gratuito de eventos de ciclismo em Portugal</strong>, que recolhe e organiza informação de fontes públicas (Federação Portuguesa de Ciclismo, Cabreira Solutions, entre outras).</span></li>
          <li className="flex gap-2"><span className="text-blue-400 mt-1">•</span><span>A Plataforma permite pesquisar, filtrar, guardar favoritos e adicionar provas ao Google Calendar do utilizador.</span></li>
          <li className="flex gap-2"><span className="text-blue-400 mt-1">•</span><span>O Cycling Calendar <strong className="text-slate-200">não é organizador de eventos</strong> e não tem qualquer responsabilidade sobre a realização, inscrições, regulamentos ou logística das provas listadas.</span></li>
        </ul>
      ),
    },
    {
      icon: Calendar,
      title: '3. Integração com o Google Calendar',
      content: (
        <>
          <p className="mb-3">Ao optar por ligar a sua conta Google e utilizar a funcionalidade de agenda:</p>
          <ul className="space-y-2">
            <li className="flex gap-2"><span className="text-green-400 mt-1">✓</span><span>Concede-nos permissão explícita para <strong className="text-slate-200">criar novos eventos</strong> no seu calendário principal.</span></li>
            <li className="flex gap-2"><span className="text-green-400 mt-1">✓</span><span>O Cycling Calendar <strong className="text-slate-200">não lê, não apaga, nem modifica</strong> quaisquer eventos pré-existentes ou pessoais no seu calendário.</span></li>
            <li className="flex gap-2"><span className="text-green-400 mt-1">✓</span><span>Pode revogar esta permissão a qualquer momento através das <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline underline-offset-2">configurações de segurança da sua conta Google</a>.</span></li>
          </ul>
        </>
      ),
    },
    {
      icon: AlertTriangle,
      title: '4. Precisão da Informação',
      content: (
        <>
          <p className="mb-3">Os dados apresentados na Plataforma são extraídos automaticamente de fontes públicas. Embora envidemos esforços razoáveis para manter a informação atualizada, <strong className="text-slate-200">não garantimos</strong> a exatidão, completude ou atualidade de:</p>
          <ul className="space-y-2">
            <li className="flex gap-2"><span className="text-amber-400 mt-1">!</span><span><strong className="text-slate-200">Datas e horários</strong> — Podem ser alterados pelas entidades organizadoras sem aviso prévio.</span></li>
            <li className="flex gap-2"><span className="text-amber-400 mt-1">!</span><span><strong className="text-slate-200">Localizações e mapas</strong> — As coordenadas e pré-visualizações servem como referência aproximada. A localização exata pode diferir.</span></li>
            <li className="flex gap-2"><span className="text-amber-400 mt-1">!</span><span><strong className="text-slate-200">Preços, escalões e regulamentos</strong> — Podem sofrer atualizações que não sejam imediatamente refletidas na Plataforma.</span></li>
            <li className="flex gap-2"><span className="text-amber-400 mt-1">!</span><span><strong className="text-slate-200">Cartazes e documentos</strong> — São extraídos automaticamente e podem estar incompletos ou desatualizados.</span></li>
          </ul>
          <div className="mt-4 p-4 bg-amber-500/10 border border-amber-500/20 rounded-lg">
            <p className="text-amber-300 text-sm font-medium">⚠ Recomendamos sempre a verificação dos detalhes no site oficial do evento antes de realizar inscrições, deslocações ou quaisquer compromissos.</p>
          </div>
        </>
      ),
    },
    {
      icon: Scale,
      title: '5. Propriedade Intelectual',
      content: (
        <ul className="space-y-2">
          <li className="flex gap-2"><span className="text-blue-400 mt-1">•</span><span>Todo o código-fonte, design, logótipos e infraestrutura do Cycling Calendar são propriedade exclusiva dos seus criadores e estão protegidos por direitos de autor.</span></li>
          <li className="flex gap-2"><span className="text-blue-400 mt-1">•</span><span>Os nomes dos eventos, logótipos institucionais (FPC, associações regionais, etc.) e conteúdo original dos organizadores pertencem aos respetivos titulares.</span></li>
          <li className="flex gap-2"><span className="text-blue-400 mt-1">•</span><span>É proibida a reprodução, redistribuição ou uso comercial dos dados agregados pelo Cycling Calendar sem autorização prévia por escrito.</span></li>
        </ul>
      ),
    },
    {
      icon: AlertTriangle,
      title: '6. Limitação de Responsabilidade',
      content: (
        <>
          <p>O Cycling Calendar é fornecido <strong className="text-slate-200">{'"tal como está" e "conforme disponível"'}</strong>, sem garantias de qualquer espécie, expressas ou implícitas. Na máxima extensão permitida pela lei aplicável:</p>
          <ul className="space-y-2 mt-3">
            <li className="flex gap-2"><span className="text-slate-500 mt-1">—</span><span>Não garantimos que a Plataforma estará sempre disponível, livre de erros, vírus ou interrupções.</span></li>
            <li className="flex gap-2"><span className="text-slate-500 mt-1">—</span><span>Não nos responsabilizamos por danos diretos, indiretos, incidentais ou consequenciais resultantes do uso da Plataforma.</span></li>
            <li className="flex gap-2"><span className="text-slate-500 mt-1">—</span><span>Não nos responsabilizamos por quaisquer prejuízos decorrentes da participação em eventos listados, incluindo cancelamentos, alterações de percurso ou acidentes.</span></li>
            <li className="flex gap-2"><span className="text-slate-500 mt-1">—</span><span>Não somos responsáveis pelo conteúdo ou práticas de sites de terceiros para os quais redirecionamos.</span></li>
          </ul>
        </>
      ),
    },
    {
      icon: Shield,
      title: '7. Conduta do Utilizador',
      content: (
        <>
          <p className="mb-3">Ao utilizar a Plataforma, o utilizador compromete-se a:</p>
          <ul className="space-y-2">
            <li className="flex gap-2"><span className="text-red-400 mt-1">✕</span><span>Não utilizar a Plataforma para qualquer finalidade ilegal ou não autorizada.</span></li>
            <li className="flex gap-2"><span className="text-red-400 mt-1">✕</span><span>Não tentar aceder de forma não autorizada aos sistemas, servidores ou bases de dados da Plataforma.</span></li>
            <li className="flex gap-2"><span className="text-red-400 mt-1">✕</span><span>Não realizar scraping automatizado ou extração massiva de dados sem autorização prévia.</span></li>
            <li className="flex gap-2"><span className="text-red-400 mt-1">✕</span><span>Não fornecer informações falsas durante o registo ou utilização do serviço.</span></li>
          </ul>
          <p className="mt-3">Reservamo-nos o direito de suspender ou encerrar o acesso de qualquer utilizador que viole estes termos.</p>
        </>
      ),
    },
    {
      icon: RefreshCw,
      title: '8. Modificações e Cessação',
      content: (
        <ul className="space-y-2">
          <li className="flex gap-2"><span className="text-blue-400 mt-1">•</span><span>Reservamo-nos o direito de modificar, suspender ou descontinuar qualquer parte do serviço, temporária ou permanentemente, com ou sem aviso prévio.</span></li>
          <li className="flex gap-2"><span className="text-blue-400 mt-1">•</span><span>Estes Termos podem ser atualizados periodicamente. A data da última atualização será sempre indicada no fundo desta página.</span></li>
          <li className="flex gap-2"><span className="text-blue-400 mt-1">•</span><span>Em caso de alterações substanciais, poderemos notificar os utilizadores registados por e-mail ou através de aviso visível na Plataforma.</span></li>
        </ul>
      ),
    },
    {
      icon: Scale,
      title: '9. Lei Aplicável e Jurisdição',
      content: (
        <p>Estes Termos de Serviço são regidos e interpretados de acordo com as leis da República Portuguesa. Para a resolução de quaisquer litígios emergentes da utilização da Plataforma, será competente o foro da comarca de Braga, com renúncia expressa a qualquer outro.</p>
      ),
    },
  ];

  return (
    <main className="min-h-screen bg-slate-950 py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-6">
            <FileText size={28} className="text-blue-400" />
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-white mb-3">Termos de Serviço</h1>
          <p className="text-slate-400 text-lg">Condições de utilização do Cycling Calendar</p>
        </div>

        {/* Intro */}
        <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-6 sm:p-8 mb-6">
          <p className="text-slate-300 leading-relaxed">
            Bem-vindo ao <strong className="text-white">Cycling Calendar</strong>. Ao aceder e utilizar o nosso website e serviços, 
            concorda em cumprir e ficar vinculado aos seguintes Termos de Serviço. Se não concordar com alguma 
            parte destes termos, não deverá utilizar a nossa plataforma.
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <div key={index} className="bg-slate-900/80 border border-white/5 rounded-2xl p-6 sm:p-8">
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-slate-800 border border-white/10">
                    <Icon size={18} className="text-slate-400" />
                  </div>
                  <h2 className="text-lg font-semibold text-white">{section.title}</h2>
                </div>
                <div className="text-slate-400 leading-relaxed text-[15px]">
                  {section.content}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">Última atualização: 24 de agosto de 2026</p>
          <a href="/contacto" className="inline-flex items-center gap-2 mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            <Mail size={14} /> Dúvidas? Contacte-nos
          </a>
        </div>
      </div>
    </main>
  );
}
