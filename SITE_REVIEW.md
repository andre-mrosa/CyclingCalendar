# Revisão do site — 9 de setembro de 2026

## Estado após implementação 1.2.0 — 10 setembro

As observações abaixo registam a revisão original. A versão 1.2.0 implementa: datas consistentes Google/ICS (incluindo exportação em lote); classes FPC corrigidas na leitura e recolha; ficha pública e modal com os mesmos componentes; documentos PDF/KML identificados; altura compacta, escalões e datas de inscrição no resumo; descrição recolhida; ação de calendário agrupada; consulta dos avisos reais e aviso de datas guardadas diferentes; conflitos por intervalo; grupos de datas por confirmar; filtro por famílias; ajuda prática e comunicação de erros com prova identificada.

Verificados 81 testes, build de produção e navegador local com dados reais (desktop claro/escuro e mobile 390×844). Na validação final do build, ajuda e ficha Alves Barbosa sem erros de consola; exportação 20260911/20260914, oito documentos e Sub-17/Estrada. Lousã: prazos, preços e descrição expansível; contacto pré-preenchido sem envio. Não se criaram/removeram eventos na conta Google durante QA; o fluxo autenticado foi coberto por testes de dados, sem validação externa de criação.

Continuação recomendada, fora desta entrega: investigar a recolha original de Race Nature Vieira Minho (data invertida e localidade contaminada, agora sinalizada como data por confirmar), validar restantes classes/escalões ambíguos da FPC, estudar simplificação do menu e recolher feedback sobre a ficha. Avisos personalizados, subscrição dinâmica ICS e atualização automática de marcações antigas continuam por implementar; não os anunciar como disponíveis. O menu atual foi preservado para evitar alterar a navegação ao mesmo tempo que a ficha.

## Âmbito e entrega

Pedido: retirar os rótulos de época/fontes e analisar o site, sobretudo a ficha da prova. Removidos os dois rótulos de PageHeading em todos os idiomas e páginas que o reutilizam. Build de produção passou. As correções abaixo são trabalho pendente, não funcionalidades entregues nesta alteração.

Revisão em produção do calendário, modal (informação, escalões, documentos), página pública de prova, agenda, favoritos e ajuda, acompanhada de leitura do código. Não é uma auditoria exaustiva: administração, pagamentos externos, criação/remoção de eventos Google e todos os fluxos autenticados não foram testados. Não se alteraram favoritos, agenda ou dados de produção.

## P0 — Datas e classificação antes da apresentação

- Grande Prémio Alves Barbosa mostra 11–13 setembro de 2026 mas o link Google Calendar contém dates=20260913/20260914. O modal acrescenta ainda um isolado «13 SET». detectRaceDate.js assume que só o último dia é competição quando o título não corresponde às heurísticas de etapas; também introduz 09:00 por defeito. Preservar o intervalo publicado e usar dia inteiro quando não existe horário explícito. Só restringir datas com evidência concreta. Validar exportações Google, ICS e integração com a mesma regra e fixtures de provas de um dia, vários dias, mudança de mês/ano e horários conhecidos/desconhecidos.
- A ficha classifica Alves Barbosa como BTT; a página oficial está na secção Estrada: https://www.fpciclismo.pt/pagina/grande-premio-alves-barbosa-10-prova . Rastrear classificação desde a extração até à apresentação. Rever escalões pela documentação, sem os corrigir por suposição.
- A página pública transforma «Nacional» em «CAMPEONATO NACIONAL». Âmbito nacional não determina que a prova seja campeonato. Separar modalidade, âmbito e tipo de competição.
- No calendário observaram-se «SET 28-27» (Race Nature Vieira Minho) e «NOV 31-01» (Enduro Santa Maria). Renderizar ambos os meses nos intervalos que os atravessam e verificar os dados originais. Granfondo Leiria Region surge em dezembro de 2027 com «EVENTO qua.» e local A DEFINIR: confirmar eventual data técnica de ordenação e apresentar datas desconhecidas numa secção própria, sem sugerir um dia confirmado.

## P1 — Uma ficha consistente e útil

- EventModal.js e app/events/[id]/EventDetailClient.js apresentam a mesma prova de maneiras diferentes. O modal tem PDF de percurso e cinco KML; a página pública diz que o perfil/track ainda não foi disponibilizado. Partilhar modelo de dados, componentes e regras entre ambas as vistas. Ausência no nosso campo não prova ausência de publicação pela organização.
- Altura fixa do modal (90dvh/88vh) deixa muito espaço vazio com dados escassos. Usar altura pelo conteúdo com limite no viewport, scroll interno acessível e ações sempre alcançáveis. Não preencher espaço com descrições genéricas.
- Resumo proposto: nome, data/horário confirmado, local, modalidade e estado; inscrições/preços/prazo quando disponíveis; escalões; documentos/percurso; mapa. Mostrar secções conforme os dados. Manter fonte e data de atualização discretas num único local. Não repetir licença e fonte no resumo, em badges e em cartões inferiores.
- Substituir os cinco «Link Adicional» por nomes úteis e formato (KML/PDF), identificando etapa/rota apenas quando o documento o permite. Não chamar GPX a ficheiros KML.
- Um botão principal «Adicionar ao calendário», com escolha Google ou Apple/Outlook e distinção clara entre integração ligada à conta e exportação manual. Indicar que data será guardada e que lembrete será incluído. Favorito é interesse; calendário é planeamento; nenhum equivale a inscrição.
- A página pública apresenta «Ponto de concentração» mas aponta apenas para Montemor-o-Velho. Distinguir localidade aproximada de partida exata. Não prometer ponto de encontro sem coordenadas/endereço confirmados.
- Meteorologia deve identificar o dia previsto em provas com vários dias. Não deixar o utilizador inferir a que data se aplica.

## P2 — Restante experiência

- Filtros por famílias: BTT deve abranger XCO/XCM/Enduro/etc., com especialidades opcionais. O mesmo princípio aplica-se a Estrada. Preservar filtros ao abrir/fechar a ficha e na navegação.
- Menu: estudar concentrar a navegação em Calendário, Minha Agenda e Favoritos; apresentar categorias de competição como filtros/acessos secundários. Validar no telemóvel antes de mudar a estrutura.
- Agenda: tornar visível o que está marcado, para quando e com que aviso; evitar texto sobre favoritos como explicação principal da agenda. Não afirmar que uma exportação manual foi efetivamente guardada pelo utilizador.
- Cancelamentos: excluir da sinalização de conflitos ativos ou explicar o seu estado, em vez de criar alarmes de coincidência sem utilidade.
- Ajuda: atualmente privilegia assistentes de região/escalão. Dar primeiro instruções concretas para pesquisar, guardar favoritos, adicionar ao calendário, configurar avisos e perceber alterações. O escalão calculado deve explicar a base/limites, em vez de prometer a categoria oficial exata sem contexto suficiente.
- Acrescentar «Comunicar erro» na ficha, com identificação da prova, para recolher correções verificáveis. Não publicar correções automaticamente.

## Ordem de execução ao retomar

1. Corrigir datas exportadas/classificação e acrescentar testes de regressão com exemplos reais.
2. Unificar dados e componentes do modal/página pública, documentos e estados de dados desconhecidos.
3. Compactar a ficha e simplificar ações de calendário, verificando teclado, mobile, temas claro/escuro e alturas pequenas.
4. Melhorar famílias de filtros, estados da agenda e ajuda.

Manter a identidade visual aprovada. Não lançar scrapers globais nem alterar a BD em massa para corrigir apresentação. Confirmar cada causa com fixtures e inspecionar git status/diff antes de retomar.
