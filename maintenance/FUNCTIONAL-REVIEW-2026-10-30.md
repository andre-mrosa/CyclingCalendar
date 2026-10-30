# Revisão funcional — 29 e 30 de outubro de 2026

## Resultado e limites

46 verificações funcionais passaram no browser: administração/quarentena, calendário, favoritos locais, pesquisas guardadas, definições e navegação. Os testes de mobile usaram uma largura real do documento de 375 px, sem overflow nos ecrãs verificados. Isto é emulação de viewport num browser Chromium, não ensaio num Android/iPhone físico nem numa PWA instalada.

266 testes automáticos passaram, sem falhas. ESLint e compilação de produção também passaram. A lista detalhada das verificações, capturas e logs está em `.qa-tools/functional-2026-10-29/` (artefactos locais ignorados pelo Git).

As ações de eliminar/restaurar usaram os componentes e a rota reais, contra tabelas PostgreSQL num schema exclusivo de QA, com 17 registos sintéticos e um botão para repor todos os registos. A identidade administrativa foi simulada apenas nesse ambiente local. Não foram eliminadas provas reais de produção.

Não se enviaram mensagens de contacto, emails ou notificações push para testar a entrega. Não se executou eliminação de contas nem se concederam novas permissões OAuth/OS. Entrega real de push, instalação e atualização numa PWA física continuam a precisar de um dispositivo e sessão adequados; os resultados desta revisão não certificam esses fluxos.

## Base de dados

Medição em leitura em 30/10/2026, 09:14 UTC:

| Medida | Valor |
| --- | ---: |
| Provas armazenadas | 1.779 |
| Em quarentena | 77 |
| Projeção pública antes da união de duplicados | 1.668 |
| Públicas com data futura/em curso | 49 |
| Públicas sem data confirmada | 3 |
| Públicas históricas | 1.616 |
| Tabela Event, incluindo índices | 10.256.384 bytes |
| EventTranslation, incluindo índices | 2.048.000 bytes |
| Conteúdo editorial antigo nos campos description/programa/gpxData/image/logo de Event | 0 bytes |

As contagens de armazenamento, publicação e UI medem conjuntos diferentes. A UI começa nas próximas provas, une alguns registos equivalentes e oferece filtros/arquivo. Quarentena e registos sem condições de publicação não entram na projeção pública.

Não há pressão de armazenamento demonstrada por este volume. O histórico dá continuidade ao arquivo e à identificação de edições/favoritos. O calendário ainda pede `years=all`; a resposta JSON medida em 29/10 tinha 655.556 bytes. Uma otimização futura deve limitar o carregamento inicial e carregar o arquivo a pedido, preservando pesquisa, calendário offline e correspondência de edições. Não se apagou histórico para reduzir este número.

## Problemas corrigidos

- **Quarentena:** o botão enviava DELETE com o ID na query e corpo vazio; a API tentava ler JSON e devolvia 500. Agora envia JSON, aceita também o formato antigo e valida IDs/corpos inválidos. Eliminação e restauro só atuam em registos ainda em quarentena, com operações condicionais que evitam corridas entre ações. O restauro preserva a origem e invalida a cache do calendário. A paginação mantém uma página válida depois de eliminar a última linha.
- **Avisos e acessibilidade:** confirmação com botão de fechar identificado; mensagem final com “Fechar”; texto da eliminação deixa de prometer que um scraper nunca voltará a encontrar a prova.
- **Datas de inscrição:** conserva-se o dia publicado, independentemente do fuso horário do browser. Exportações de horários de inscrição usam Europe/Lisbon. O badge relativo só aparece depois da hidratação.
- **Google Calendar:** falhas na procura/criação do calendário dedicado ou na verificação de duplicados deixam de escrever silenciosamente noutro calendário. Tratados popups bloqueados, URLs inválidos e aviso de evento já existente; atualização imediata dos indicadores de agenda.
- **Duplicados oficiais:** união restrita de Ciclocross/Ciclocrosse exige título equivalente, mesmo dia e mesmo local, mantendo os IDs alternativos dos favoritos. Uma localização antiga da 6.ª ronda foi corrigida para Barcelos após consulta ao calendário FPC, com cópia do valor anterior.
- **Hidratação das datas:** reprodução em desenvolvimento identificou espaços finos produzidos pelo ICU do servidor, contra espaços normais no browser, em `Intl.DateTimeFormat.formatRange`. A mesma etiqueta normalizada serve agora o texto acessível e o atributo aria-label; a correção foi verificada num carregamento novo com dados renderizados no servidor.
- **Fontes desativadas:** uma seleção vazia deixava de ser respeitada e voltava a todas as fontes. Também se apresentava a lista inicial completa do servidor quando só algumas estavam ativas. Agora a seleção vazia mostra zero provas sem fazer uma chamada inválida, a lista inicial respeita as fontes e uma pesquisa partilhada conserva uma seleção vazia.
- **Âmbito:** a Taça Oeste XCM era classificada como Taça de Portugal. Corrigida a regra para reconhecer Oeste como âmbito regional, sem alterar títulos explicitamente nacionais, e corrigido o único registo afetado identificado. O valor anterior está guardado em `regional-cup-plan.json`. Confirmada a presença da prova na página Regionais.

O aviso da captura fornecida pelo utilizador referia ainda o `<html>` do layout de QA: next-themes altera os atributos antes da hidratação. Esse layout passou a usar a mesma proteção explícita que já existia no layout público. O erro de texto das datas acima era outro problema e foi corrigido no código público.

## Cobertura funcional realizada

- Desktop e mobile: procurar, cancelar, eliminar e restaurar quarentena; contadores; estado sem resultados; filtro de categoria; última página; reposição dos dados QA.
- Desktop: provas futuras, pesquisa sem acentos, navegação mensal, prova nos dois dias da grelha, escolha de dia, ficha e ligação à origem.
- Desktop: adicionar, persistir e remover favoritos locais; download real ICS validado no disco; guardar/aplicar/apagar pesquisa e reabrir ligação partilhada.
- Mobile: favoritos repetidos a 375 px reais, incluindo recarregamento; pesquisa sem acentos, grelha e seleção de dia; fontes vazias e fonte única.
- Mobile: quatro idiomas, persistência de idioma, tema e paleta; ordem e visibilidade de separadores/fontes; assistente de escalão para época 2027 e nascimento 2012, limpeza de sugestão ao alterar o ano e aplicação do filtro; abrir/fechar assistente de região sem usar GPS.
- Site publicado em mobile: menu e mudança de página, Escape, Internacionais, Nacionais, Taças, Regionais e Lazer; duplicados oficiais das rondas 5 e 6; formulário de contacto vazio bloqueado pela mensagem obrigatória.
- Verificação HTTP independente: 13 páginas públicas responderam 200; prova inexistente respondeu 404; antigos caminhos legais responderam 308 para os destinos corretos.

Não se fizeram alterações ao funcionamento de recolhas de madrugada nesta continuação, para além da classificação regional acima. O relatório anterior de scrapers/PWA e as suas limitações estão em `APP-REVIEW-2026-10-29.md`.
