# Validação web, mobile e administração

Revalidação em 15/09/2026 no projeto local `CyclingCalendar-app`, com compilação de produção Next.js.

## Verificação de código

- 120 testes automáticos passaram, incluindo autenticação, permissões, favoritos, operações administrativas, calendário e sincronização.
- ESLint sem erros nem avisos: `eslint . --max-warnings 0`.
- Compilação de produção concluída com código de saída 0.

## Matriz no navegador

Resultado consolidado: **51 cenários aprovados nos três perfis**. A última ronda integral passou 48/51; as três falhas eram a expectativa incorreta do título da página vazia após logout. O cenário foi corrigido e repetido nos três perfis, com 12/12 verificações de login, favoritos, logout e erros JavaScript aprovadas. Os registos originais e o reteste foram preservados.

Nenhum dos três perfis registou erros JavaScript de página na última ronda integral. Os erros de pré-carregamento observados no WebKit durante a navegação duplicada do teste de logout deixaram de ocorrer quando o teste passou a aguardar o redirecionamento do Clerk. Todas as contas temporárias foram eliminadas.

Perfis: PC Chromium (1440×1000), Android emulado Pixel 7/Chromium e iPhone emulado iPhone 13/WebKit. Idioma pt-PT. A matriz de operações bloqueia service workers para permitir interceções controladas; o teste PWA usa um contexto separado com service worker ativo.

Cenários executados em cada perfil:

- 17 páginas sem conta: calendário, favoritos, agenda, nacionais, internacionais, taças, regionais, lazer, definições, ajuda, contacto, admin, login, registo, privacidade, termos e página offline. Verificação HTTP e ausência de transbordo horizontal.
- Pesquisa sem resultados e reposição da lista; adicionar/remover favoritos de visitante, persistência ao recarregar, detalhe da prova e exportação ICS com eventos.
- Tema claro/escuro e menu mobile com fecho por Escape.
- Sessão real Clerk de conta normal: APIs administrativas recusam com 403; visitante recebe 401; painel restrito.
- Favoritos autenticados confirmados no servidor e após recarregar.
- Link privado de calendário: ativação pela UI, leitura de ICS com eventos, revogação pela UI e resposta 404 para o link revogado.
- Agenda de uma conta sem Google Calendar associado: estado vazio correspondente.
- Admin: seis APIs de consulta e cinco separadores — visão geral, inventário, operações, utilizadores e logs.
- Pesquisa de utilizador, cancelar limpeza, executar limpeza dos favoritos da conta temporária e confirmar o resultado no Clerk.
- Segunda conta temporária: cancelar eliminação, confirmar que ainda existe, eliminar permanentemente pela UI e confirmar que deixou de existir no Clerk.
- Pesquisa e exportação JSON dos logs; abrir a confirmação de eliminação do histórico e cancelar.
- Sincronização: estados ocupado/concluído e bloqueio de duplo início com respostas interceptadas. Não é uma execução real de recolha das fontes.
- Revogação do próprio papel admin: API passa a recusar; após recarregar, painel restrito. Logout e separação dos favoritos entre conta e visitante.
- Pedidos com paginação, retenção e modo de eliminação inválidos recusados sem alterações.

A sessão real é criada por ticket Clerk de curta duração numa instância de testes. As contas temporárias são eliminadas no final. Palavra-passe e OAuth Google não fazem parte deste teste de entrada.

## Offline

Teste separado em Chromium/Pixel 7 com service worker real: carregar a aplicação online, desligar rede, adicionar favorito local, recarregar offline, confirmar calendário e favorito e recuperar ligação, incluindo abertura e fecho do menu offline. Passou na compilação final, sem erros JavaScript de página.

Num arranque sem rede, se o Clerk não conseguir resolver a identidade, apenas o armazenamento separado de visitante fica disponível. Este teste não confirma o carregamento inicial dos dados privados de uma conta sem autenticação disponível.

## Correções

- Autenticação: removida a aceitação de identidade retirada de JWT sem validação de assinatura. O Clerk valida a sessão.
- Permissões master: correspondência exata de ID ou email verificado. Nomes de utilizador e emails parciais/não verificados não concedem privilégios.
- Admin: interface e navegação dependem da confirmação do servidor e descartam respostas de sessões anteriores. API distingue visitante, conta normal e indisponibilidade temporária. Acesso restrito inclui ligação ao login.
- Favoritos: armazenamento observável por conta, gravações remotas em sequência, conservação de alterações pendentes após falhas e sincronização ao recuperar ligação. Sem gravações dentro de atualizações de estado React.
- Agenda: cache SWR separada por utilizador; dados locais só são usados como alternativa offline. Escritas de armazenamento fora do render.
- Calendário: filtragem derivada dos dados e filtros, paginação associada à lista, inicialização coerente dos filtros, leitura observável do cache e estado online.
- Detalhe de prova, percurso, meteorologia e tradução: carregamentos associados à chave dos dados atuais. A janela de detalhe reinicia o estado por prova; respostas antigas não substituem a prova atual.
- Idioma, navegação, contacto e telemetria: retiradas atualizações redundantes em efeitos e chamadas impuras durante render.
- Imagens locais: componentes Next/Image. Imagens externas de dimensões desconhecidas mantêm dimensionamento nativo, com exceções de lint documentadas e limitadas a essas imagens.
- Lint: comando atualizado para ESLint. Código gerado, backups e scripts avulsos antigos da raiz são excluídos; fontes da aplicação, testes e configuração ativa continuam verificados.


## Correções adicionais desta revalidação

- Oito rotas antigas de manutenção passaram a exigir admin antes de qualquer consulta ou alteração: reset, limpeza de duplicados, recolha Cabreira, recolha FPC completa, sincronização GPX, diagnóstico Cabreira, tradução global e unificação de provas. Os testes isolados cobrem visitante, conta normal, indisponibilidade da autenticação e admin autorizado.
- A tarefa cron recusa pedidos se não existir segredo configurado e exige o segredo correto. A fila continua validada com dependências isoladas.
- Modo de eliminação inválido deixa de assumir eliminação permanente. Falha ao consultar a conta deixa de ser apresentada como eliminação bem-sucedida.
- Retenção e paginação dos logs são validadas; indisponibilidade da base de dados devolve erro 503 em vez de uma lista vazia com sucesso.
- Registo do service worker tolera bloqueio pelo navegador. Rotas de manutenção usam rede e não respostas antigas em cache.
- Favoritos locais de visitante continuam disponíveis após recarregar offline, mesmo que o Clerk não carregue.
- O foco dos diálogos é colocado antes da pintura do ecrã, evitando uma janela em que Escape não chega ao menu acabado de abrir.

As capturas do detalhe (após a animação), favoritos, tema e painéis de administração foram inspecionadas visualmente. Uma verificação adicional do conteúdo do detalhe e fecho por Escape passou nos três perfis.

## Limites

- Android e iPhone foram emulados; não foi usado telemóvel físico, Safari instalado num iPhone ou instalação PWA no dispositivo.
- Não foi efetuada escrita num Google Calendar real, envio do formulário de contacto, eliminação global de logs ou nova sincronização real das fontes.
- As operações destrutivas reais limitaram-se às contas temporárias e respetivos favoritos. As operações globais de manutenção foram verificadas com dependências isoladas e testes de recusa pela rede.
- O servidor Clerk de testes emitiu avisos de renovação/redirecionamento de sessão durante a automação. As sessões por ticket e os controlos de acesso completaram os testes; não foi verificado se os avisos também ocorrem com palavra-passe/OAuth ou em produção.
- Nenhum deploy foi publicado.

## Evidência local

- `qa-revalidate.log` e `.qa-tools/revalidation/results.json`: ronda integral original e confirmação de limpeza das contas.
- `qa-logout-retest.log`, `.qa-tools/revalidation/logout-retest/results.json` e `.qa-tools/revalidation/verified-results.json`: reteste e consolidação dos 51 cenários, com origem de cada resultado.
- `qa-visual-detail.log` e `*-detail-reviewed.png`: conteúdo e inspeção visual dos detalhes nos três perfis.
- `.qa-tools/revalidation/*.png`: capturas PC/Android/WebKit, incluindo conta e admin; ficheiros ICS e JSON das exportações na mesma pasta.
- `qa-pwa.log`: service worker, interação offline, recarregamento e reconexão.
- `qa-repeat-tests.log`, `qa-repeat-lint.log`, `qa-repeat-build.log`: verificações da compilação final.
- `qa-maintenance-before.log` e `qa-maintenance-after.log`: reprodução isolada das permissões em falta e confirmação da correção.

Os artefactos de execução ficam locais, ignorados pelo Git. Regressões em `tests/auth-permissions.test.mjs`, `tests/favorite-sync.test.mjs`, `tests/admin-operations.test.mjs` e `tests/scraper-status.test.mjs`.

Comandos: `node --test tests/*.test.mjs`, `node node_modules/eslint/bin/eslint.js . --max-warnings 0`, `node node_modules/next/dist/bin/next build --webpack`.
