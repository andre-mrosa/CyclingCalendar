# Interface simples — setembro de 2026

Direção aprovada pelo utilizador: fundo neutro, verde discreto, navegação curta, lista cronológica e pesquisa fácil de encontrar.

## Implementação

- Cabeçalho sem fotografia, com título e descrição curtos.
- Pesquisa, modalidade e distrito juntos, sempre acessíveis também em mobile.
- Filtros adicionais expansíveis; removidos os seletores duplicados de distrito e de provas passadas/futuras.
- Lista ocupa a largura do conteúdo, sem calendário lateral ou painel promocional. A vista mensal e a seleção de dia continuam disponíveis.
- Datas e títulos com peso visual mais leve; favoritos usam a cor principal. Cancelamentos e conflitos continuam explícitos.
- Navegação Calendário, Minha Agenda e Guardadas; restantes categorias no menu Provas. Navegação inferior em mobile.
- Ficha da prova inicialmente simplificada e depois substituída pela estrutura descrita abaixo.
- Cores neutras partilhadas por páginas, definições e autenticação, em modo claro e escuro. Paletas e preferências existentes preservadas.
- Textos atualizados nos quatro idiomas, incluindo o nome correto da paleta verde.

## Verificação desta ronda

- 129 testes automáticos aprovados, incluindo contraste e comportamento dos calendários.
- ESLint sem erros ou avisos; compilação de produção concluída.
- Inspeção da lista e do detalhe com dados reais, nos modos claro e escuro.
- Pesquisa por Coruche combinada com modalidade Gravel e distrito Santarém: duas provas; abertura da ficha Gravel Para Todos.
- Mobile: 375 × 812 e 320 × 740; largura do documento sem transbordo horizontal.
- Guardar prova como visitante, consultar Guardadas e remover a prova de teste.
- Expansão de filtros, navegação para outubro e mudança para vista mensal.
- Não foram testados nesta ronda login autenticado, Google Calendar ou operações administrativas. Os testes antigos dessas áreas estão documentados separadamente e não constituem validação da nova UI.

## Ambiente

O servidor de desenvolvimento anterior misturava módulos antigos com a nova renderização. A verificação funcional foi feita com a compilação de produção num servidor local novo. O acesso à base de dados necessitou de execução fora da restrição de rede do sandbox; o primeiro servidor restrito apresentou o estado de erro esperado.

As alterações estão locais, sem commit, push ou publicação. Logs de verificação: `qa-simple-ui-build.log`, `qa-simple-ui-lint.log` e `qa-simple-ui-tests.log` (ignorados pelo Git).

## Detalhe da prova — proposta aprovada, setembro de 2026

- Datas de início e fim dispostas na vertical na lista e no detalhe; meses identificados quando diferentes.
- Cabeçalho comum em desktop e mobile: modalidade, título, local, data, inscrições, favoritos e partilha.
- Percursos à vista; programa cronológico aberto inicialmente; inscrições, localização, organização/documentos, prémios/seguro e descrição em secções expansíveis. Secções sem dados omitidas.
- O mesmo componente de apresentação serve a janela da lista e a página independente `/events/[id]`, que usa a navegação comum.
- Preservados links oficiais, documentos, perfis GPX, meteorologia e exportações de calendário. Não são inventados preços, distâncias ou relações entre percursos e preços.
- Opções de inscrição múltiplas são links visíveis na secção, acessíveis sem hover. Imagens ampliadas podem ser fechadas por botão e Escape também na página independente.
- Validação: 129 testes passaram; lint dos componentes e traduções sem erros; compilação de produção. Verificados favoritos (adicionar/remover), expansão das inscrições e opções de calendário, dados completos e escassos, datas desconhecidas e múltiplos dias, claro/escuro e larguras de 320/375 px sem transbordo horizontal.
- As operações autenticadas de escrita no Google Calendar não foram executadas. Logs desta ronda: `qa-event-detail-tests.log` e `qa-event-detail-build.log`.
