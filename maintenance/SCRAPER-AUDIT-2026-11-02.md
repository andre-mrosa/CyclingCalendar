# Auditoria dos scrapers — 2 de novembro de 2026

## Âmbito

Descoberta → pedidos → interpretação → classificação → correspondência entre fontes → persistência → deduplicação pública → diagnóstico de qualidade. As regras são universais; não se corrigiram nomes de provas por exceção nem se inventaram dados em falta.

## Problemas corrigidos

- Apedalar ignorava títulos/datas não interpretáveis; Recorde também podia tratar um layout inesperado como zero eventos. Agora produzem erros operacionais e balanços de cobertura. Uma listagem vazia da Recorde só é reconhecida com a mensagem explícita da fonte.
- Sitemaps passam a suportar índices, namespaces, URLs relativas, entidades XML e deduplicação. Entradas sem URL, XML truncado, origens inesperadas e limites de leitura são erros explícitos. Uma falha num sitemap filho pode ser assinalada sem perder os candidatos dos restantes. Não são descarregadas páginas de provas duas vezes para obter campos diferentes.
- Stop and Go não exige palavras de ciclismo em slugs com o ano atual/seguinte. Verifica também páginas de ciclismo sem ano. As modalidades da listagem continuam a fornecer candidatos com nomes neutros. Um sitemap indisponível não impede a leitura das listagens, e uma modalidade com falha não apaga os candidatos já recolhidos nas outras. Recusas 401/403/429 continuam a interromper a fonte sem contorno.
- Cabreira resolve e valida links relativos, deduplica cartões, interpreta datas pelo parser comum e deixa de usar o fallback de dezembro/dia 1. Falhas HTTP, títulos em falta e exceções na página de detalhes deixam de se transformar em registos parcialmente verificados. Dados sem uma data interpretável ficam assinalados, sem criar um dia de prova fictício.
- Uma linha FPC com data ilegível não faz desaparecer as outras provas válidas da época. O erro fica registado. A confirmação do formulário e a recusa de uma época errada continuam obrigatórias.
- Escalões retirados pela própria fonte deixam de persistir como classificações antigas. A evidência oficial FPC não é substituída pela seleção de uma plataforma externa. Categorias contraditórias BTT/Estrada da Recorde não classificam arbitrariamente uma prova de nome neutro como Estrada.
- Datas de inscrição publicadas numa plataforma voltam a poder atualizar provas combinadas com FPC; a prioridade da classificação desportiva não bloqueia esses campos. Código/scripts não contam como texto de inscrições; janelas com abertura posterior ao fecho são recusadas.
- Modalidades explicitamente incompatíveis impedem fusões por nomes semelhantes, tanto na BD como no fallback da lista pública.
- A identidade de uma prova combinada considera também os links secundários confirmados. A repetição com factos reais detetou que uma mudança de nome e de link principal podia duplicar a linha FPC na recolha seguinte. Corrigida a regra geral; preservam-se as restrições sobre linhas FPC distintas e datas diferentes.
- Uma fonte que reutiliza o mesmo slug/ID num ano seguinte cria uma edição separada; não substitui a edição anterior nem os seus favoritos. A recolha repetida encontra o mesmo ID da nova edição.
- As tarefas duráveis conservam as épocas do plano inicial, incluindo numa retoma/viragem de ano. Um lote aguarda todos os pedidos em curso antes de terminar a etapa, mesmo com uma recusa. Uma fonte já percorrida com candidatos inválidos não é imediatamente descarregada toda novamente.
- A fronteira de gravação rejeita explicitamente metadados inválidos, em vez de devolver `null` e deixar o chamador contar uma gravação inexistente.

## Controlo automático

Cada fonte regista candidatos únicos, processados, passados, outras modalidades, fora das épocas, páginas removidas (404/410), falhas e candidatos sem desfecho. Os balanços ficam no log da execução e nas medições de qualidade. O painel de qualidade mostra estas contagens e alerta para páginas por resolver e quedas na descoberta, além dos controlos existentes. Uma página incompleta não é apresentada como prova de que o calendário está vazio. Estes diagnósticos não apagam nem reativam provas.

## Verificação ao vivo sem gravações

Leitura da BD seguida de execução dos scrapers sobre uma cópia em memória: 151 pedidos às quatro fontes verificadas diretamente; zero gravações em produção e zero emails. Só se guardaram factos, contagens e diagnósticos locais, sem corpos integrais de páginas ou dados de contas.

| Fonte | Candidatos | Processados | Outros resultados |
| --- | ---: | ---: | --- |
| FPC 2026 | 435 | 15 | 420 passados |
| FPC 2027 | 0 | 0 | Formulário confirmado, época ainda vazia |
| Cabreira | 13 | 10 | 1 passado, 2 de corrida |
| Recorde Pessoal | 2 | 2 | Categoria Estrada explicitamente vazia |
| Apedalar | 133 | 13 | 117 passados, 3 sem página individual válida |

As 40 operações da simulação encontraram registos existentes. Não foi necessário criar provas adicionais para os factos válidos recolhidos. A BD continha 1.780 registos; a seleção ampla de provas futuras/em curso ou sem data interpretável produziu 49 registos públicos, 47 após as duas deduplicações de apresentação. Estas contagens não significam cobertura de todas as provas de Portugal.

Três URLs Apedalar presentes no sitemap devolvem HTTP 200, mas mostram apenas «PRÓXIMOS EVENTOS», sem data nem metadados da prova: `taca-oeste-xcm-2027-cas-runa`, `4a-edicao-do-open-torres-vedras-xcm` e `taca-oeste-xcm-2027-batalha-do-vimeiro`. Foram confirmadas por uma leitura factual adicional delimitada. Ficam assinaladas para nova tentativa numa sincronização posterior; não se adivinhou uma data pelo slug ou ano do título.

Não foi realizada recolha direta extensiva da Stop and Go pelo agente: mantém-se a limitação da auditoria anterior relativa ao robots da fonte para agentes de IA. A revisão dessa fonte abrange código, fixtures e factos já na aplicação; não é uma certificação de cobertura ao vivo. Três datas antigas dessa fonte continuam não interpretáveis (Desafio ACDL 2027–2028, série XCM de vários meses, Race Nature com intervalo invertido). A apresentação/exportação comum já não as trata como datas confirmadas. A quarentena existente foi preservada.

Artefactos locais: `.qa-tools/scraper-nov2-live.json`, `scraper-nov2-facts.json` e `scraper-nov2-unread.json`. A simulação foi executada antes das últimas proteções de índices parciais/IDs anuais; estas têm regressões sintéticas adicionais e não exigem repetir pedidos às fontes.

Repetição final offline das 40 recolhas factuais sobre os 1.780 registos: primeira passagem com 37 atualizações e 3 correspondências entre fontes; segunda passagem novamente com 1.780 registos e zero IDs removidos. A falha de idempotência encontrada durante esta repetição está coberta por uma regressão de três rondas FPC/organizador. Artefacto: `.qa-tools/scraper-nov2-final-replay.json`.

## Validação

Suite final: 363 testes aprovados; ESLint e build de produção concluídos. As alterações não exigem migração. Não foi disparada uma segunda recolha global de produção nesta auditoria: os mesmos pedidos já foram usados na simulação, e as regras/medições novas entram na próxima sincronização agendada.

Regressões em `tests/scraper-completeness.test.mjs` e `tests/scraper-status.test.mjs`, além da suite existente: XML/índices/paginação, erros parciais, recusas, lotes concorrentes, neutralidade de nomes, datas e modalidades, escalões retirados, prioridade FPC, novas edições e preservação de IDs. Não se usam emails, contas ou escritas de provas em produção nos testes.

As fontes podem publicar erros ou mudar de estrutura. O objetivo destas alterações é melhorar cobertura e tornar falhas visíveis e reproduzíveis; não se declara uma garantia de zero erros externos.
