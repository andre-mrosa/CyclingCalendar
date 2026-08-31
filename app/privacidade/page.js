import { Shield, Eye, Lock, UserCheck, Database, Globe, Cookie, RefreshCw, Mail, Trash2, KeyRound, Calendar, Ban, Check } from 'lucide-react';
import PageHeading from '../components/PageHeading';
import styles from '../components/site.module.css';

export const metadata = {
  title: 'Política de Privacidade | Cycling Calendar',
  description: 'Política de Privacidade do Cycling Calendar',
};

export default function PrivacyPolicy() {
  const sections = [
    {
      icon: Eye,
      title: '1. Informação que Recolhemos',
      content: (
        <>
          <p className="mb-3">Quando utiliza o Cycling Calendar, podemos recolher os seguintes dados:</p>
          <div className="space-y-3">
            <div className="p-4 bg-soft rounded-xl border border-line">
              <h4 className="text-ink font-medium text-sm mb-2"><KeyRound size={15} className="inline-block align-middle shrink-0 mr-1" aria-hidden="true" />Através do Login com Google (via Clerk)</h4>
              <ul className="space-y-1 text-sm text-muted">
                <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400">•</span>Nome completo e endereço de e-mail</li>
                <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400">•</span>Foto de perfil (URL público do Google)</li>
                <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400">•</span>Identificador único de utilizador</li>
              </ul>
            </div>
            <div className="p-4 bg-soft rounded-xl border border-line">
              <h4 className="text-ink font-medium text-sm mb-2"><Calendar size={15} className="inline-block align-middle shrink-0 mr-1" aria-hidden="true" />Integração com Google Calendar</h4>
              <ul className="space-y-1 text-sm text-muted">
                <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400">•</span>Token de acesso OAuth 2.0 (para criar eventos no seu calendário)</li>
                <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400">•</span><strong className="text-ink">Não acedemos a eventos existentes</strong> — apenas criamos novos eventos que o utilizador solicite</li>
              </ul>
            </div>
            <div className="p-4 bg-soft rounded-xl border border-line">
              <h4 className="text-ink font-medium text-sm mb-2">⭐ Dados de Utilização</h4>
              <ul className="space-y-1 text-sm text-muted">
                <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400">•</span>Lista de eventos marcados como favoritos</li>
                <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400">•</span>Preferências de filtros e região (armazenadas localmente no browser)</li>
              </ul>
            </div>
          </div>
        </>
      ),
    },
    {
      icon: Database,
      title: '2. Como Usamos a Informação',
      content: (
        <>
          <p className="mb-3">A informação recolhida é utilizada <strong className="text-ink">exclusivamente</strong> para:</p>
          <ul className="space-y-2 text-muted">
            <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400 mt-1"><Check size={15} aria-hidden="true" /></span><span>Permitir a autenticação segura no nosso serviço</span></li>
            <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400 mt-1"><Check size={15} aria-hidden="true" /></span><span>Guardar e sincronizar as suas provas favoritas</span></li>
            <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400 mt-1"><Check size={15} aria-hidden="true" /></span><span>Adicionar eventos de ciclismo ao seu Google Calendar quando solicitado</span></li>
            <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400 mt-1"><Check size={15} aria-hidden="true" /></span><span>Enviar comunicações relacionadas com o serviço (se aplicável)</span></li>
          </ul>
          <div className="mt-4 p-4 bg-rose-50 dark:bg-red-500/10 border border-rose-200 dark:border-red-500/20 rounded-xl">
            <p className="text-rose-700 dark:text-red-300 text-sm font-medium"><Ban size={15} className="inline-block align-middle shrink-0 mr-1" aria-hidden="true" />Nunca partilhamos, vendemos, alugamos ou cedemos a sua informação pessoal a terceiros para fins comerciais ou de marketing.</p>
          </div>
        </>
      ),
    },
    {
      icon: Globe,
      title: '3. Partilha com Terceiros',
      content: (
        <>
          <p className="mb-3">Podemos partilhar informação limitada com os seguintes prestadores de serviço, estritamente necessários ao funcionamento da Plataforma:</p>
          <ul className="space-y-2 text-muted">
            <li className="flex gap-2"><span className="text-brand mt-1">•</span><span><strong className="text-ink">Clerk</strong> — Autenticação e gestão de sessões de utilizador</span></li>
            <li className="flex gap-2"><span className="text-brand mt-1">•</span><span><strong className="text-ink">Google (API Calendar)</strong> — Criação de eventos no calendário do utilizador</span></li>
            <li className="flex gap-2"><span className="text-brand mt-1">•</span><span><strong className="text-ink">Vercel</strong> — Alojamento e infraestrutura da aplicação</span></li>
            <li className="flex gap-2"><span className="text-brand mt-1">•</span><span><strong className="text-ink">Neon (PostgreSQL)</strong> — Armazenamento da base de dados</span></li>
          </ul>
          <p className="mt-3 text-sm">Todos estes prestadores cumprem normas rigorosas de proteção de dados e operam sob os seus próprios termos de privacidade.</p>
        </>
      ),
    },
    {
      icon: Cookie,
      title: '4. Cookies e Armazenamento Local',
      content: (
        <>
          <p className="mb-3">O Cycling Calendar utiliza:</p>
          <ul className="space-y-2 text-muted">
            <li className="flex gap-2"><span className="text-brand mt-1">•</span><span><strong className="text-ink">Cookies de sessão</strong> — Essenciais para manter a autenticação ativa (geridos pelo Clerk). Não podem ser desativados sem perder a funcionalidade de login.</span></li>
            <li className="flex gap-2"><span className="text-brand mt-1">•</span><span><strong className="text-ink">LocalStorage</strong> — Para guardar preferências de filtros, região, tema e outras definições locais. Estes dados nunca saem do seu browser.</span></li>
          </ul>
          <p className="mt-3 text-sm">Não utilizamos cookies de rastreamento, analytics de terceiros ou pixels de publicidade.</p>
        </>
      ),
    },
    {
      icon: Lock,
      title: '5. Segurança dos Dados',
      content: (
        <ul className="space-y-2 text-muted">
          <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400 mt-1"><Lock size={15} aria-hidden="true" /></span><span>Todas as comunicações são encriptadas via <strong className="text-ink">HTTPS/TLS</strong>.</span></li>
          <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400 mt-1"><Lock size={15} aria-hidden="true" /></span><span>A autenticação é gerida pelo <strong className="text-ink">Clerk</strong>, um serviço certificado que segue as melhores práticas de segurança (bcrypt, tokens com validade limitada).</span></li>
          <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400 mt-1"><Lock size={15} aria-hidden="true" /></span><span>Os tokens de acesso ao Google Calendar são armazenados de forma segura e utilizados apenas para a finalidade declarada.</span></li>
          <li className="flex gap-2"><span className="text-emerald-500 dark:text-green-400 mt-1"><Lock size={15} aria-hidden="true" /></span><span>Não armazenamos palavras-passe — a autenticação é feita integralmente via OAuth 2.0 do Google.</span></li>
        </ul>
      ),
    },
    {
      icon: UserCheck,
      title: '6. Os Seus Direitos (RGPD)',
      content: (
        <>
          <p className="mb-3">Ao abrigo do Regulamento Geral sobre a Proteção de Dados (RGPD) da União Europeia, o utilizador tem o direito de:</p>
          <ul className="space-y-2 text-muted">
            <li className="flex gap-2"><span className="text-brand mt-1">→</span><span><strong className="text-ink">Acesso</strong> — Solicitar uma cópia de toda a informação pessoal que detemos sobre si.</span></li>
            <li className="flex gap-2"><span className="text-brand mt-1">→</span><span><strong className="text-ink">Retificação</strong> — Solicitar a correção de dados pessoais incorretos ou desatualizados.</span></li>
            <li className="flex gap-2"><span className="text-brand mt-1">→</span><span><strong className="text-ink">Eliminação</strong> — Solicitar a eliminação permanente dos seus dados pessoais ("direito ao esquecimento").</span></li>
            <li className="flex gap-2"><span className="text-brand mt-1">→</span><span><strong className="text-ink">Portabilidade</strong> — Receber os seus dados num formato estruturado e de uso comum.</span></li>
            <li className="flex gap-2"><span className="text-brand mt-1">→</span><span><strong className="text-ink">Oposição</strong> — Opor-se ao tratamento dos seus dados para determinadas finalidades.</span></li>
            <li className="flex gap-2"><span className="text-brand mt-1">→</span><span><strong className="text-ink">Revogar acesso</strong> — Revogar a permissão do Cycling Calendar na sua <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" className="text-brand hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2">conta Google</a> a qualquer momento.</span></li>
          </ul>
          <p className="mt-3 text-sm">Para exercer qualquer um destes direitos, contacte-nos através da nossa <a href="/contacto" className="text-brand hover:text-blue-700 dark:hover:text-blue-300 underline underline-offset-2">página de contacto</a>. Responderemos no prazo máximo de 30 dias.</p>
        </>
      ),
    },
    {
      icon: Trash2,
      title: '7. Retenção e Eliminação de Dados',
      content: (
        <ul className="space-y-2 text-muted">
          <li className="flex gap-2"><span className="text-brand mt-1">•</span><span>Os dados de conta são mantidos enquanto o utilizador tiver uma conta ativa no Cycling Calendar.</span></li>
          <li className="flex gap-2"><span className="text-brand mt-1">•</span><span>Ao eliminar a sua conta ou revogar o acesso, todos os dados pessoais associados serão removidos no prazo de 30 dias.</span></li>
          <li className="flex gap-2"><span className="text-brand mt-1">•</span><span>Dados de eventos de ciclismo (públicos, agregados de fontes externas) não são considerados dados pessoais e podem ser mantidos independentemente.</span></li>
        </ul>
      ),
    },
    {
      icon: Shield,
      title: '8. Menores de Idade',
      content: (
        <p>O Cycling Calendar não se destina a menores de 16 anos. Não recolhemos intencionalmente dados pessoais de menores. Se tomarmos conhecimento de que um menor nos forneceu dados pessoais, procederemos à sua eliminação imediata. Se é pai/tutor e acredita que o seu filho nos forneceu informação pessoal, contacte-nos.</p>
      ),
    },
    {
      icon: RefreshCw,
      title: '9. Alterações a esta Política',
      content: (
        <>
          <p>Podemos atualizar esta Política de Privacidade periodicamente para refletir alterações nas nossas práticas ou requisitos legais. Notificaremos sobre quaisquer alterações substanciais publicando a nova Política nesta página, com a data da última atualização visível.</p>
          <p className="mt-3">Recomendamos que reveja esta página periodicamente para se manter informado sobre como protegemos a sua informação.</p>
        </>
      ),
    },
  ];

  return (
    <div className={`${styles.page} ${styles.secondary}`}>
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <PageHeading title="Política de Privacidade" subtitle="Como protegemos e tratamos os seus dados" />

        {/* Intro */}
        <div className={styles.legalIntro}>
          <p className="text-ink leading-relaxed">
            A sua privacidade é muito importante para nós. Esta Política de Privacidade explica de forma clara e transparente 
            como o <strong className="text-ink">Cycling Calendar</strong> recolhe, utiliza, protege e partilha a sua informação pessoal
            quando utiliza o nosso website e serviços, em conformidade com o Regulamento Geral sobre a Proteção de Dados (RGPD).
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-4">
          {sections.map((section, index) => {
            const Icon = section.icon;
            return (
              <section key={index} className={`${styles.panel} ${styles.legalSection}`}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-soft border border-slate-200 dark:border-white/10">
                    <Icon size={18} className="text-muted" />
                  </div>
                  <h2 className="text-lg font-semibold text-ink">{section.title}</h2>
                </div>
                <div className="text-muted leading-relaxed text-[15px]">
                  {section.content}
                </div>
              </section>
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">Última atualização: 24 de agosto de 2026</p>
          <a href="/contacto" className="inline-flex items-center gap-2 mt-3 text-sm text-blue-400 hover:text-blue-300 transition-colors">
            <Mail size={14} /> Dúvidas sobre privacidade? Contacte-nos
          </a>
        </div>
      </div>
    </div>
  );
}
