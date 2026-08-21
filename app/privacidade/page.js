export const metadata = {
  title: 'Política de Privacidade | Cycling Calendar',
  description: 'Política de Privacidade do Cycling Calendar',
};

export default function PrivacyPolicy() {
  return (
    <main className="min-h-screen bg-slate-900 text-slate-300 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-slate-800/50 backdrop-blur border border-white/10 p-8 rounded-2xl shadow-xl">
        <div className="prose prose-invert max-w-none">
          <h1>Política de Privacidade</h1>
          
          <p>
            Bem-vindo ao <strong>Cycling Calendar</strong>. A sua privacidade é muito importante para nós. 
            Esta Política de Privacidade explica como recolhemos, usamos, protegemos e partilhamos a sua informação pessoal 
            quando utiliza o nosso website e serviços.
          </p>

          <section>
            <h2>1. Informação que Recolhemos</h2>
            <p>Quando utiliza o Cycling Calendar através do login com a sua conta Google, solicitamos acesso a:</p>
            <ul>
              <li><strong>Informações de Perfil Básicas:</strong> Nome e endereço de e-mail (para criar e gerir a sua conta).</li>
              <li><strong>Integração com o Google Calendar:</strong> Acesso para criar e gerir eventos (apenas os eventos que optar por adicionar através da nossa plataforma).</li>
            </ul>
          </section>

          <section>
            <h2>2. Como Usamos a Informação</h2>
            <p>A informação recolhida é utilizada exclusivamente para:</p>
            <ul>
              <li>Permitir a autenticação segura no nosso serviço.</li>
              <li>Permitir-lhe guardar as suas provas favoritas.</li>
              <li>Adicionar automaticamente os eventos de ciclismo que escolher ao seu Google Calendar.</li>
            </ul>
            <p className="text-red-400 font-semibold">
              Nunca partilhamos, vendemos ou alugamos a sua informação pessoal a terceiros. 
              Também não lemos nem acedemos aos eventos pessoais que já tem no seu calendário.
            </p>
          </section>

          <section>
            <h2>3. Proteção e Segurança</h2>
            <p>
              Adotamos medidas de segurança adequadas para proteger contra o acesso não autorizado, alteração, 
              divulgação ou destruição dos seus dados pessoais. O acesso à sua conta é gerido de forma segura 
              através de fornecedores de autenticação de renome (Google e Clerk).
            </p>
          </section>

          <section>
            <h2>4. Os Seus Direitos</h2>
            <p>
              Tem o direito de aceder, retificar ou apagar a sua informação pessoal a qualquer momento. 
              Pode também revogar o acesso do Cycling Calendar à sua conta Google através das definições 
              de segurança da sua conta Google, na secção "Aplicações de terceiros com acesso à conta".
            </p>
          </section>

          <section>
            <h2>5. Alterações a esta Política</h2>
            <p>
              Podemos atualizar a nossa Política de Privacidade periodicamente. 
              Notificaremos sobre quaisquer alterações publicando a nova Política de Privacidade nesta página.
            </p>
          </section>

          <section>
            <h2>Contactos</h2>
            <p>
              Se tiver alguma dúvida sobre esta Política de Privacidade, não hesite em contactar-nos através do e-mail de suporte.
            </p>
          </section>

          <div className="mt-12 pt-6 border-t border-white/10 text-sm text-slate-500">
            Última atualização: {new Date().toLocaleDateString('pt-PT')}
          </div>
        </div>
      </div>
    </main>
  );
}
