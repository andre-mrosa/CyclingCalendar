# Continuação — utilidade do calendário (2026-09-08)

## Correção validada — carregamento e clique (1.1.1, 2026-09-09)
- Relato: lista aparece em duas fases e linha da prova não abre ao clicar.
- Confirmado: título abre em produção, mas seta/localidade não tinham área clicável. Botão nativo agora cobre a linha inteira; estrela fica acima e independente. Testado clicando na localidade (abriu) e estrela (não abriu); favorito temporário de visitante reposto no QA.
- API de lista tinha 5 953 917 bytes para 1611 provas. Nova resposta tem 863 368 bytes, mesmas 1611 provas (redução ~85,5%, sem compressão). Retira imagens/base64, regulamentos e traduções extensas da lista; ficha continua a obter detalhes completos.
- Cache local passa a fallback offline/erro, separado por fontes; resposta vazia válida não ressuscita dados antigos. Eliminada corrida com /api/sync-version. Novo namespace de cache e removido fallback prematuro aos 3 segundos no service worker.
- Datas para deduplicação calculadas uma vez por registo, não milhões de vezes durante comparações.
- Mostra até 100 provas de uma vez; no histórico usa botão explícito Mostrar mais, sem spinner/crescimento automático a cada 15 linhas. No QA as 69 próximas provas apareceram juntas.
- Testes de regressão para conteúdo da lista e seleção de cache adicionados: 70/70 testes passaram. QA de abertura fora do título e independência da estrela concluído. Build final passou em 09/09. Entrega preparada para master; confirmar publicação no remoto ao retomar.

## Objetivo autorizado
Melhorar a fiabilidade dos dados, fichas de provas, filtros e agenda mantendo o design compacto atual. O utilizador aprovou a análise e pediu documentação contínua para retomar quando renovar o uso. Não confundir guardar favoritos, marcar agenda e inscrição real.

## Base
master, versão 1.0.1, commit 28e22e1. Logo aprovado: arredondado e transparente. Não redesenhar.

## Plano e estado
- [x] Datas de inscrição: parser testado, preservar horas explícitas e fecho final (não confundir fases). Lousã tem fecho no regulamento mas campo vazio.
- [x] Duplicados: rever comparação de datas/títulos, preservar IDs e fontes, proteger provas oficiais distintas.
- [x] Ficha: datas e ações antes do regulamento, regulamento expansível.
- [x] Filtros: modalidade visível e atalhos temporais, distrito; manter filtros avançados.
- [x] Lista: cancelamentos destacados, dia da semana, menos redundância.
- [x] Agenda: contagem contextual, próximas datas/avisos, clareza das ações existentes.
- [x] Verificar testes/build e navegador, atualizar este documento com resultados e limitações.
- [x] Preparar versão 1.1.0 validada para commit/push em master. Confirmar publicação com git log/status e remoto ao retomar.

## Observações verificadas no site
- Possíveis duplicados: Rota de Basto / NGPS - ROTA DE BASTO; Monção e Melgaço Gf / Granfondo; Gravel para Todos.
- Lousã: regulamento indica abertura 30-03-2026 às 20h00 e fecho 08-09-2026 às 23h59; UI mostra abertura às 00h00 e fecho A definir.
- Tab Inscrição & Preços mostra regulamento muito longo antes dos campos úteis.
- Página principal omite modalidade de activeFilters apesar de o componente a suportar.
- Agenda já tem exportação ICS, conflitos e integração Google: desenvolver essa base.

## Retomar
Revisão mais recente: ver [SITE_REVIEW.md](SITE_REVIEW.md), com divergências verificadas entre modal/página pública, datas exportadas, classificação e prioridades. Rótulos de época/fontes removidos do cabeçalho; build de produção passou. As restantes conclusões da revisão continuam pendentes.

Ler este documento e git diff/status antes de trabalhar. Seguir AGENTS.md. Não lançar scrapers nem alterações na BD de produção indiscriminadamente. Validar com dados de teste primeiro. npm no PATH estava avariado (npm-cli.js em Roaming ausente); node funciona, é possível executar testes com node --test e Next via node node_modules/next/dist/bin/next.

## Checkpoint de implementação
- Parser novo em app/utils/registrationDates.js: abertura com hora, fecho global explícito, rejeita datas inválidas/conflitantes e não confunde reembolsos/fases. Integrado scraper Cabreira, API lista/detalhe, modal e API de criação no Google. Corrige dados antigos na leitura sem mutação em massa na BD.
- Convenção existente: datas de inscrição guardam hora de Lisboa nos campos UTC; a integração Google aplica Europe/Lisbon. planning.js respeita essa convenção.
- Merge na apresentação compara dia ISO quando o texto da data difere; preserva todos os IDs/links/fontes e preenche campos em falta. Mantém salvaguardas do matcher para campeonatos e linhas FPC distintas. Não executada unificação destrutiva da BD.
- Modal põe datas/avisos antes de regulamento expansível.
- Filtros rápidos e modalidade/distrito visíveis; contagem contextual na agenda; resumo da próxima prova e fechos confirmados; cancelamentos destacados e dia da semana na lista; cabeçalho compacto.
- Corrigida dependência ausente de markedSet no efeito dos filtros (agenda deve atualizar depois de carregar marcações).
- Validação final: 68/68 testes passaram; build de produção passou após os ajustes visuais e rótulos. Versão 1.1.0 em package.json e lockfile. Push para master é o último passo desta entrega; o estado remoto deve ser confirmado ao retomar.
- Resumo de preços extraído apenas de secção explícita (preserva fases/condições, não infere preço atual). Fontes e data de atualização da ficha visíveis; não se apresenta updatedAt como verificação oficial. Rótulos distinguem exportação manual de integração Google.
- Verificado no navegador local com dados reais: Lousã abertura 30/03 às 20h00, fecho 08/09 às 23h59, preços 43/47/47/51 com condições; filtros de fim de semana e Granfondo; largura móvel 390×844 sem overflow horizontal; ficha com scroll e ações acessíveis. Contraste do separador ativo corrigido.
- Comparação dos duplicados reais revelou fontes já agregadas com FPC. Regra adicional apenas para provas abertas com identidade normalizada exata, mesma localidade e mesmo dia; duas linhas FPC originais continuam separadas. Lista reduziu 1611 para 1606 nesta amostra.
- Avisos de fecho agora respeitam o dia de Lisboa; vencimento hoje diz último dia, não amanhã. Atalho de fim de semana inclui provas que começam na sexta e terminam no domingo.

## Limitações e próximos passos sugeridos
- Não foi criada nem removida qualquer marcação na conta Google durante QA. Fluxo autenticado continua com os avisos existentes (1 dia/1 hora para inscrições); a mudança na API aplica o parser comum. Validar manualmente uma criação de teste e remoção com autorização específica se necessário.
- Ainda não há escolha personalizada de antecedência, subscrição dinâmica ICS ou notificações automáticas de alterações/cancelamentos. Estas são próximas funcionalidades, não funcionalidades anunciadas nesta versão.
- Parser conservador cobre o formato numérico explícito observado; outros regulamentos podem continuar a mostrar dados por definir. Não prometer cobertura completa das fontes.
- Junção atual é de apresentação; não remove registos de produção. As regras destrutivas de unificação da BD não foram relaxadas.
- Melhorias futuras: filtros por famílias (BTT agregando XCO/XCM/etc.), normalizar horários de todos os scrapers para um esquema explícito de fuso horário, expandir extração de inscrições por fonte com fixtures reais e validação de conflitos.
