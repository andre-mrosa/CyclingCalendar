# Auditoria de descoberta, classificação e publicação — 30/10/2026

## Âmbito e evidência

Inspeção do percurso listagem/sitemap → página → interpretação → classificação partilhada → criação/atualização/merge → contrato público → filtros e deduplicação do calendário. Base de dados inspecionada em leitura, sem executar uma sincronização global de produção. Os artefactos locais de QA guardam factos de provas e contagens, não descrições, cartazes, participantes, credenciais ou cópias integrais das páginas.

| Fonte | Verificação direta | Resultado delimitado |
| --- | --- | --- |
| FPC | Um POST por época, janeiro–dezembro de 2026 e 2027; formulário confirmado. | 435 linhas em 2026, das quais 17 futuras/decorrentes na data da auditoria. Todas representadas, incluindo três registos combinados com outras fontes. Época 2027 ainda vazia no formulário confirmado; não se fabricaram provas para preencher a época. |
| Cabreira | 14 cartões da listagem; execução em modo de recolha local do scraper atualizado, sem persistência. | Dois eventos passados e duas São Silvestres excluídos; 10 provas futuras recolhidas em 11 pedidos, sem erros. Todas representadas. O regulamento de VCPGE identifica explicitamente BTT. Nenhuma paginação encontrada nessa listagem. |
| Apedalar | 129 URLs únicos do sitemap; comparação de datas/títulos/links com a BD. Segunda leitura delimitada dos metadados dos 115 layouts sem QUANDO. | 14 provas futuras, todas representadas. As outras 115 têm datas passadas nos metadados; nenhuma data futura adicional nem falha HTTP nessa verificação. As duas passagens foram uma auditoria pontual: o scraper de produção continua a fazer uma única leitura por URL. |
| Recorde Pessoal | Duas categorias públicas, BTT e ciclismo de estrada, e amostra de página individual. | Dois eventos BTT futuros e zero cartões na categoria estrada; ambos os eventos representados. Confirmados seletores e formato de data/hora da amostra. |
| Stop and Go | Código, dados já existentes e testes sintéticos de sitemap/listagem/paginação/cabeçalho/recusa. | Não se fez uma nova recolha direta extensiva: o robots.txt exclui expressamente ChatGPT-User/OAI e outros agentes de IA. Isto limita a auditoria direta, não comprova que o bot próprio da aplicação esteja bloqueado nem constitui licença de recolha. Não se afirma cobertura ao vivo integral desta fonte. |

Foram inspecionados 1.779 registos. No critério amplo da análise — futuro ou data não interpretável — havia 52 registos não colocados em quarentena, todos convertíveis pelo contrato público. A deduplicação no cliente juntava apenas dois pares de Ciclocross/Ciclocrosse, com o mesmo dia/local. Uma data não interpretável não demonstra que a prova é futura: a análise distinguiu esses casos da cobertura confirmada acima.

As três linhas futuras da FPC sem um ID isolado estavam nas provas combinadas Granfondo Portimão, Rota Corno de Bico/Nascentes do Coura e Gravel Montijo. A simples ausência do ID FPC não foi contada como prova em falta.

## Correções universais

- Evidência positiva de ciclismo prevalece nos eventos mistos de ciclismo/caminhada. Títulos neutros dentro de uma categoria explicitamente de ciclismo deixam de ser descartados só por não terem uma palavra-chave. Corridas/trails sem evidência de ciclismo continuam excluídos.
- Gravel/Granfondo explícitos prevalecem sobre termos genéricos como maratona/trilhos e classificações antigas. As exceções de marcas conhecidas passam a ser fallback, sem se sobreporem à modalidade/especialidade explícita de uma nova variante. Não se adicionaram exceções com o nome das duas provas encontradas.
- Cabreira lê a modalidade de uma declaração explícita no regulamento que já descarrega. Menções ao Código da Estrada não tornam a prova uma corrida de estrada. Termos como cicloturistas passam a reconhecer o tipo de passeio. Classes oficiais CN de BTT/BMX/Pista são reconhecidas sem depender de um título extenso.
- Apedalar deduplica URLs do sitemap antes dos pedidos. Datas dedicadas e metadados de data inequívocos são interpretados pelo mesmo parser; datas impossíveis são recusadas, horas não se tornam dias e intervalos que atravessam meses são preservados. Apedalar/Recorde deixam de regravar provas confirmadamente passadas. Cabreira não descarta datas expressamente por definir com base numa data auxiliar.
- URLs absolutas/relativas da Recorde são resolvidas com validação de origem e deduplicadas; um link malformado não anula a restante categoria. A categoria publicada fornece contexto para modalidades de nomes neutros.
- Paginação relativa da Stop and Go conserva filtros, deduplica modalidades e já não ignora silenciosamente páginas superiores à décima. Existe limite operacional de 50 páginas por modalidade, que produz erro de recolha incompleta se atingido; não se apresenta esse caso como lista completa.
- Recusas HTTP 401/403/429 interrompem a fonte e não desencadeiam novas tentativas imediatas da mesma etapa. Uma falha de página depois de já terem sido gravadas provas deixa a execução parcial sem repetir toda a fonte nesse mesmo run. Falhas de estrutura/modalidade/data deixam erro operacional, em vez de desaparecerem como zero provas válidas. Continua a ser possível uma tentativa posterior numa nova sincronização.
- Pedidos identificam o serviço como CyclingCalendar, com contacto do projeto, em vez de usar a identificação genérica de navegador. Não há identificação como Googlebot nem contorno de bloqueios.
- Rondas ordinais, especialidades distintas e páginas distintas da mesma fonte têm proteção contra junção por semelhança de nomes. Uma prova adiada na mesma página/ano pode atualizar o registo original mesmo fora da janela de quatro dias; preserva o ID usado nos favoritos. Uma nova edição noutro ano mantém-se separada. A URL genérica de calendário FPC não é identidade de uma prova.
- Uma prova aberta já combinada com FPC, cujo organizador muda o nome, pode ser reencontrada pela página individual exata e pelo mesmo dia. Mantém-se a proibição de juntar duas linhas FPC distintas só por semelhança ou pelo mesmo portal.
- A FPC passa ao plano diário, mantendo um pedido por época. Retirado o cron semanal redundante; a opção semanal continua compatível para execução manual/retomas. Isto evita o atraso anterior de até uma semana para novidades exclusivas da FPC.

## Atualização dos dados atuais

Uma simulação de 27 recolhas factuais FPC/Cabreira sobre a cópia local dos 1.779 registos resultou em 1.779 registos, sem criação de duplicados ou substituição dos IDs existentes. A simulação identificou duas modalidades anteriormente vazias: VCPGE → BTT, com evidência explícita no regulamento, e homenagem aos cicloturistas → Passeio/Lazer, pela regra geral do título.

Aplicaram-se apenas esses dois campos `tag` na BD, com condição de ainda estarem vazios. Verificação posterior confirmou as duas classificações. Não se apagaram provas, não se alteraram favoritos/datas nem se reativaram registos em quarentena. As regras continuam a funcionar automaticamente nas recolhas futuras.

## Limites e pontos que não foram adivinhados

Continuam identificados três rótulos de datas antigas da Stop and Go que não permitem uma data de prova segura: Desafio ACDL com anos 2027–2028, uma página de série regional com intervalo de vários meses, e Race Nature Vieira Minho com intervalo invertido. Não foram corrigidos por suposição nem republicados como datas válidas de exportação. O parser novo recusa intervalos incompatíveis com uma prova individual e assinala a recolha para revisão. Uma página de série não equivale a cada uma das provas dessa série.

Os scrapers só descobrem os eventos publicados pelas fontes configuradas. Não há garantia de que incluam todas as provas de Portugal, de que as fontes publiquem tudo atempadamente ou de que nunca mudem os seus formatos. Não se saltaram permanentemente URLs antigas com base no slug, no ano do nome ou num `lastmod` presumido: isso poderia perder uma edição nova reutilizando o mesmo endereço. Sitemaps/listagens e páginas com campos distintos continuam a exigir pedidos distintos. A redução de pedidos redundantes não equivale a reduzir arbitrariamente cobertura.

## Validação técnica

`npm test`: 304 testes aprovados. `npm run lint` e `npm run build`: concluídos sem erros. Os testes adicionais cobrem provas mistas, nomes neutros em categorias publicadas, metadados de data, datas inválidas e intervalos, classificação explícita versus marcas/formatos, URLs duplicadas/absolutas, paginação relativa e página 11, recusas HTTP, tentativas de etapas, preservação de IDs em adiamentos e separação de edições/formatos/linhas FPC. A simulação com factos reais e a alteração limitada de duas modalidades estão descritas acima; não se confundem com uma sincronização global em produção.

## Comparação jurídica com Google e recolha manual

Googlebot também é um crawler. Recolha, indexação, apresentação de resultados e eventual reutilização especializada são operações que se devem distinguir; a identidade Google não é uma licença universal que se transfira para outro serviço. Os controlos documentados de robots/noindex/snippets regulam a interação técnica com o Google, não demonstram, por si sós, uma licença para este calendário. [Googlebot](https://developers.google.com/search/docs/crawling-indexing/googlebot), [controlo de conteúdo na pesquisa](https://developers.google.com/search/docs/crawling-indexing/control-what-you-share).

Copiar factos isolados manualmente não equivale automaticamente a infração. Também não torna lícita, por ser manual, uma extração que preencha os requisitos de proteção de uma base: o TJUE admite que a consulta no ecrã seguida de seleção/transposição possa constituir extração. [TJUE C-304/07](https://eur-lex.europa.eu/legal-content/EN/ALL/?uri=CELEX%3A62007CJ0304).

O TJUE tratou também de um motor de pesquisa especializado e de bases livremente acessíveis: a avaliação inclui a extração/reutilização e o risco para a recuperação do investimento relevante, a verificar no caso concreto. Não existe, nesta auditoria, uma conclusão de que todas as fontes têm esse direito, de que todo o scraping é ilícito ou de que indexar eventos é automaticamente permitido. [TJUE C-762/19](https://eur-lex.europa.eu/legal-content/en/TXT/?uri=CELEX%3A62019CJ0762). Mantêm-se as condições e limites da revisão jurídica complementar.
