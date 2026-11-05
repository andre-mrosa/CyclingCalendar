# Plano de recolha mensal: MQ Series e Bairrada 150

Estado: proposta inicial, conservada como referência. A implementação e os limites efetivos estão descritos em [ORGANIZADORES-MENSAL-2026-11-05.md](ORGANIZADORES-MENSAL-2026-11-05.md). Análise de páginas públicas e HTML realizada em 5 de novembro de 2026. Não foram feitas consultas ao Stop & Go nesta análise.

## Decisões pedidas pelo proprietário

- Recolha mensal destas organizações, separada das recolhas diárias atuais.
- Prova com mês/ano e sem dia: publicar no mês com dia «—».
- Abertura de inscrições apenas com mês: usar o primeiro dia desse mês no calendário, conservando a indicação de que é uma previsão mensal.

## Resultados da análise

### Mountain Quest

- [Página principal](https://mountainquest.pt/): data explícita de 19 de junho de 2027, Amarante. A mesma página inclui referências à edição anterior. O JSON-LD contém ainda startDate de 20 de junho de 2026.
- [Inscrições](https://mountainquest.pt/registrations/): configuração ativa date='2027-06-19'; dicionários PT/EN/ES anunciam abertura em abril de 2027. Parte relevante do conteúdo é colocada no ecrã por JavaScript. JSON-LD antigo também contém data de 2026 e SoldOut. Não interpretar essa disponibilidade como estado de 2027.
- [Regulamento](https://mountainquest.pt/regulations/): explicitamente Mountain Quest 2026. Os períodos, valores, limites e condições dessa edição não podem ser transferidos automaticamente para 2027.
- [Programa](https://mountainquest.pt/programa/): conteúdo dinâmico e elementos de referência; um comentário que menciona uma data não é um anúncio válido. Ler a configuração ativa e a edição do programa antes de recolher horários.
- [Mutante](https://mountainquest.pt/mutant/): mistura apresentação MMXXVII e briefing MMXXVI. Tratar inicialmente como extensão/modalidade da Mountain Quest, sem criar uma prova independente por cada distância ou bloco da página.
- [Aplicação](https://app.mountainquest.pt/): confirma textos referentes a 19 de junho de 2027, mas conserva referências e percursos de 2026. Fonte de confirmação, não fonte principal para prazos de inscrição.

Conclusão: extrator específico por secções, com suporte a valores literais usados pelo conteúdo dinâmico. Não executar scripts externos para extrair dados nem confiar globalmente no JSON-LD, na meta description ou em qualquer ano encontrado no HTML.

### MQ Series / Iron Rider / Terra Norte

- [MQ Series](https://mountainquest.pt/mqseries/): anuncia Iron Rider Salvador do Monte em fevereiro de 2027, Iron Rider Castelo de Paiva em setembro de 2027 e Terra Norte em outubro de 2027. Não anuncia o dia destes eventos.
- [Iron Rider](https://ironrider.pt/): páginas atuais ainda incluem provas realizadas em 2026 e anúncio de Iron Inferno, um duatlo em desenvolvimento. Não classificar automaticamente este último como prova de BTT.
- [Regulamento de Salvador](https://ironrider.pt/regulamento/): prova de 8 de março de 2026, prazo de inscrições de 27 de fevereiro de 2026.
- [Regulamento de Castelo](https://ironrider.pt/regulamento-castelo/): prova de 13 de setembro de 2026; abertura de inscrições em 17 de julho de 2026 às 20h00 e prazo de 10 de setembro de 2026. Ambos servem para testar o parser, não para preencher 2027.
- [Terra Norte](https://terranorte.pt/) e [regulamento](https://terranorte.pt/percurso/regulamento/): edição zero de 17 de outubro de 2026, não competitiva, acesso por candidatura/convite, sem inscrições pagas nessa edição. Não extrapolar esse processo para 2027.

Conclusão: MQ Series serve para descoberta e anúncio mensal; as páginas específicas completam os factos quando forem atualizadas. Salvador e Castelo são provas distintas. Percursos, produtos, resultados e inscritos não são eventos novos.

### Bairrada 150

- [Entrada oficial](https://www.bairrada150.pt/bairrada150/): edição de 9 de maio de 2026, Águeda; sem anúncio de 2027 encontrado nas páginas consultadas.
- [Regulamento](https://www.bairrada150.pt/bairrada150/index.php/informacoes/regulamento): 11.ª edição de 2026; organização Grupo Desportivo e Cultural de Recardães. Inscrições de 1 de dezembro de 2025, 00h00, a 30 de abril de 2026, 23h59. Primeira fase até 31 de março; prazo de pagamento até 3 de maio. Distinguir estes três tipos de prazo.
- [A Prova](https://www.bairrada150.pt/bairrada150/index.php/informacoes/a-prova): ainda refere a 10.ª edição, mostrando que páginas do mesmo site não são atualizadas em conjunto.
- O menu liga às inscrições no Stop & Go. Guardar o endereço, mas qualquer leitura desse domínio tem de passar pela proteção comum já existente; o extrator do organizador não pode contornar um bloqueio.
- O formulário «create an account» é uma conta do site, não o formulário da prova.

Conclusão: usar página principal e regulamento da mesma edição. Manter Bairrada 150 / Bairrada Ultra Marathon / Bairrada Ultra Marathon 150 como nomes reconhecidos da mesma série. Não criar uma edição de 2027 sem anúncio.

## Dados e apresentação

Adicionar suporte explícito à precisão das datas, em vez de codificar tudo num texto e numa data completa:

- Identificador estável da série, edição e ronda; ligação entre variantes quando aplicável.
- Data da prova: ano, mês opcional, dia opcional, precisão «dia», «mês», «ano» ou «desconhecida».
- Abertura/fecho de inscrições: valor, precisão, ano associado e texto factual original.
- Para cada informação: URL de origem, edição a que pertence e instante da verificação.
- Data operacional do lembrete separada do facto publicado. As datas existentes conservam precisão exata por defeito, salvo registos já marcados por confirmar.

Exemplos:

| Informação publicada | Apresentação no site | Exportação |
|---|---|---|
| Prova em 19/06/2027 | 19 JUN 2027 | Prova em 19/06/2027 |
| Prova em outubro de 2027 | — OUT 2027, dia por confirmar | Sem data exata para exportar a prova |
| Inscrições abrem em janeiro de 2027 | Abertura prevista: janeiro 2027 | Lembrete de dia inteiro em 01/01/2027 |
| Inscrições abrem em 17/07/2027 às 20h | Data e hora publicadas | Entrada às 20h em Europe/Lisbon |
| Sem anúncio de edição futura | Série seguida; próxima edição por anunciar | Sem entrada inventada |

O lembrete de mês terá título «Abertura prevista de inscrições — [prova]» e descrição «A organização anunciou apenas o mês; o dia 1 foi usado como lembrete». Não marcar inscrições como efetivamente abertas só por se chegar a esse dia. Não inventar o último dia do mês como fecho. Se o ano não estiver explícito, só o associar quando o contexto da edição o estabelecer sem ambiguidade; uma abertura em dezembro pode pertencer à prova do ano seguinte.

Na lista, eventos mensais ficam numa secção «Dia por confirmar» dentro do mês. Na grelha, ficam num bloco do próprio mês sem serem colocados num dia. A precisão tem de chegar também à pesquisa, filtros, detalhes, favoritas, modo offline, ICS, Google Calendar e dados estruturados SEO. sortDate pode manter uma referência técnica para ordenação, mas não estabelece um dia conhecido. Não eliminar a prova no primeiro dia do mês por uma comparação de eventos passados.

Quando surgir o dia exato, atualizar a mesma edição, sem duplicar nem perder favoritos/participação. Um lembrete já criado só deve ser ajustado conforme a sincronização e permissões existentes, conservando uma identidade estável.

## Agendamento e acesso

1. Uma primeira recolha de referência após implementação e validação.
2. Depois, uma execução mensal por organização, no dia 1, com horários separados e sem incluir estas fontes na rotina diária de recolha.
3. Estado persistente com última tentativa, último sucesso, próxima execução, erro e prazo de bloqueio; impedir execuções simultâneas e repetição por reentrada do agendador.
4. A rotina diária pode consultar o estado local, mas não faz pedidos a estes sites antes da data mensal.
5. Por ciclo inicial, máximo de 20 páginas HTML relevantes no conjunto; sem imagens, mapas, participantes, resultados ou rastreio ilimitado. Pedidos sequenciais, com pelo menos dois segundos entre pedidos ao mesmo domínio.
6. Usar ETag/Last-Modified quando existirem; caso contrário comparar o conteúdo factual relevante. Estes cabeçalhos não são prova de edição nem de alteração factual.
7. HTTP 429 respeita Retry-After; HTTP 403 suspende a fonte e fica visível. Nova data de acesso nunca antecede o bloqueio nem o intervalo mensal configurado. Erros não originam ciclos de tentativas imediatas.
8. Botão de verificação manual no painel pode antecipar o intervalo mensal quando explicitamente acionado, mas não ignora bloqueios.

A recolha mensal pode demorar cerca de um mês a descobrir um anúncio e pode perder uma janela curta de inscrições. Não aumentar automaticamente a frequência: uma eventual exceção perto das inscrições seria uma decisão futura do proprietário.

## Integração e regras de atualização

- Infraestrutura comum para acesso, precisão, proveniência e agendamento; extratores específicos para Mountain Quest, MQ Series, Iron Rider, Terra Norte e Bairrada.
- Validar os domínios e as ligações descobertas antes de os seguir. Usar sitemaps apenas para descobrir páginas relevantes dentro dos limites; nunca aceitar automaticamente um domínio novo por aparecer numa ligação.
- Comparar provas com FPC e plataformas existentes, respeitando série, edição, ronda e modalidade; reter os identificadores usados por favoritos e calendário.
- Preferir factos específicos da edição atual; não criar uma prioridade cega «organizador vence sempre». Um regulamento antigo não substitui um anúncio atual.
- Conflitos entre fontes exatas da mesma edição aparecem para revisão. A ausência de um campo numa consulta não apaga informação já confirmada. Uma página desaparecida não significa cancelamento.
- Cancelamento/adiamento exige anúncio explícito. Revisões manuais mantêm a sua origem e não são silenciosamente substituídas.
- O painel distingue «sem nova edição publicada» de «falha de leitura», e mostra cobertura separada por organização e prova.

## Ordem de implementação e aceitação

1. Modelo de precisão de datas e regras partilhadas; migração compatível com dados atuais.
2. Lista/grelha/detalhe/offline/exportações e lembretes mensais.
3. Extratores e ligação ao mecanismo de fusão; executar primeiro em simulação, sem escrever na base de dados.
4. Mostrar o resultado da simulação: factos, edição, precisão, origem e conflitos.
5. Integrar agenda mensal e painel; só depois ativar gravações e primeira recolha.

Testes necessários: MQ 2027 com JSON-LD de 2026; inscrições de abril apenas em JavaScript; regulamento antigo ignorado; anúncio mensal em fevereiro/setembro/outubro; Bairrada com abertura em dezembro do ano anterior; prazo de fase e pagamento não confundidos com encerramento; nomes alternativos; rondas distintas; duatlo não importado como BTT; mês sem dia em todos os ecrãs e offline; lembrete mensal convertido depois para data exata sem duplicar; bloqueio impede todos os pedidos; repetição do agendamento não repete recolha; página alterada gera aviso em vez de sucesso vazio.

Resultado esperado da simulação com as fontes analisadas: MQ em 19/06/2027 e abertura prevista em abril de 2027; Iron Rider Salvador em fevereiro de 2027 e Castelo em setembro de 2027, ambos sem dia; Terra Norte em outubro de 2027, sem dia; Bairrada sem nova edição de 2027 identificada.
