export const metadata = {
  title: 'Termos de Serviço | Cycling Calendar',
  description: 'Termos de Serviço do Cycling Calendar',
};

export default function TermsOfService() {
  return (
    <main className="min-h-screen bg-gray-900 text-gray-200 py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto bg-gray-800 p-8 rounded-2xl shadow-xl">
        <h1 className="text-3xl font-bold text-white mb-6">Termos de Serviço</h1>
        
        <div className="space-y-6 text-gray-300">
          <p>
            Bem-vindo ao <strong>Cycling Calendar</strong>. Ao aceder e utilizar o nosso website e serviços, 
            concorda em cumprir e ficar vinculado aos seguintes Termos de Serviço. Se não concordar com alguma 
            parte destes termos, não deverá utilizar a nossa plataforma.
          </p>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">1. Uso do Serviço</h2>
            <ul className="list-disc pl-5 space-y-2">
              <li>O Cycling Calendar é um agregador de eventos de ciclismo, desenvolvido para facilitar a pesquisa e organização de provas (BTT, Estrada, etc.).</li>
              <li>É responsável por garantir que as informações fornecidas durante o registo (via Google) são precisas.</li>
              <li>O uso da nossa plataforma para qualquer propósito ilegal ou não autorizado é estritamente proibido.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">2. Integração com o Google Calendar</h2>
            <p className="mb-2">Ao optar por adicionar eventos ao seu Google Calendar através da nossa aplicação:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Concede-nos permissão explícita para criar novos eventos no seu calendário principal.</li>
              <li>O Cycling Calendar <strong>não lê, não apaga, nem modifica</strong> quaisquer eventos pré-existentes ou pessoais no seu calendário.</li>
              <li>Pode revogar esta permissão a qualquer momento através das configurações de segurança da sua conta Google.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">3. Precisão da Informação e Mapas</h2>
            <p className="mb-2">
              Os dados dos eventos presentes na nossa plataforma são extraídos e agregados de fontes públicas (como a 
              Federação Portuguesa de Ciclismo e Cabreira Solutions). Embora façamos os possíveis para manter a 
              informação atualizada, <strong>não nos responsabilizamos</strong> por:
            </p>
            <ul className="list-disc pl-5 space-y-2">
              <li>Alterações de datas, cancelamentos, ou informações incorretas fornecidas pelas entidades organizadoras.</li>
              <li><strong>Localizações dos Mapas:</strong> As pré-visualizações de mapas e coordenadas geradas na nossa plataforma servem apenas como referência aproximada. Não garantimos a sua exatidão e não assumimos qualquer responsabilidade caso a localização apresentada no mapa não corresponda ao local exato do evento.</li>
            </ul>
            <p className="mt-3">
              Recomendamos sempre a verificação dos detalhes e moradas no site oficial do evento antes de realizar inscrições ou viagens.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">4. Propriedade Intelectual</h2>
            <p>
              Todo o código-fonte, design, logótipos e infraestrutura do Cycling Calendar são propriedade exclusiva 
              dos seus criadores. Os nomes dos eventos, logótipos institucionais (como o da FPC) e links de inscrição 
              pertencem aos respetivos organizadores.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">5. Limitação de Responsabilidade</h2>
            <p>
              O Cycling Calendar é fornecido "tal como está". Não garantimos que a plataforma estará sempre 
              livre de erros ou interrupções. Em caso algum seremos responsáveis por danos diretos, indiretos ou 
              consequenciais resultantes do uso do nosso serviço ou da participação em qualquer evento listado.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-white mt-8 mb-3">6. Modificações aos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar ou substituir estes Termos de Serviço a qualquer momento. 
              O uso continuado do serviço após a publicação de quaisquer alterações constitui a aceitação dos novos termos.
            </p>
          </section>

          <div className="mt-12 pt-6 border-t border-gray-700 text-sm text-gray-500">
            Última atualização: {new Date().toLocaleDateString('pt-PT')}
          </div>
        </div>
      </div>
    </main>
  );
}
