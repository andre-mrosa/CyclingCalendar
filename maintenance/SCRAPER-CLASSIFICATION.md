# Classificação automática na recolha

As cinco fontes ativas (FPC, Cabreira, Stop and Go, Apedalar e Recorde Pessoal) gravam através de `saveOrMergeEvent`, que chama `toMinimalScrapedEvent` e `classifyScrapedEvent` antes de procurar/criar/atualizar uma prova. Classificações futuras devem ser corrigidas nesta regra comum ou nos leitores de campos publicados, acompanhadas de regressões. Uma alteração isolada de um registo na BD não substitui a correção da regra.

## Comportamento

- Modalidade, âmbito e escalões são normalizados a partir do título e dos campos estruturados recolhidos. Descrições promocionais não alimentam esta classificação.
- A modalidade publicada continua a ser usada quando o nome é genérico: «Rota» não deve transformar BTT em passeio sem modalidade.
- «Taça» por si só não significa Taça de Portugal. São necessárias indicações nacionais explícitas ou a classificação oficial TP. Taças regionais reconhecidas mantêm o âmbito regional.
- «Grande Prémio», «GP», «Clássica», «Volta» e «Memorial» não estabelecem, por si só, âmbito nacional. O fallback para uma prova sem indícios deixou também de ser «Prova Aberta».
- Campos sem confirmação ficam vazios. A prova permanece no calendário geral; não recebe um âmbito inventado nem entra nos filtros desse âmbito por defeito.
- A FPC pode fornecer classificações através da coluna oficial (por exemplo CN, TP ou 1.17); os factos extraídos pelo parser são conservados ao reduzir o registo aos metadados permitidos.
- A recolha volta a aplicar as regras a IDs existentes e a provas equivalentes. Quando a fonte com prioridade deixa de sustentar um âmbito/modalidade antigo, esses campos são limpos. Classificações FPC têm prioridade sobre outra plataforma.
- Escalões confirmados numa atualização da mesma fonte substituem a lista anterior, evitando conservar categorias antigas indevidas. Dados de uma nova fonte não substituem escalões oficiais já conhecidos. Repetir a recolha mantém o resultado e o ID.
- Quarentena, validação de ligações e limites da recolha mínima continuam a ser aplicados antes de gravar.

## Verificação de 30/10/2026

Regressões em `tests/scraper-classification-persistence.test.mjs` percorrem criação e recolha seguinte nas cinco fontes; correção de classificações antigas; âmbito desconhecido; prioridade FPC; atualização de escalões no mesmo ID e em correspondências entre fontes; e proteção contra descrições promocionais. `tests/calendar-scrapers.test.mjs` verifica também o percurso parser FPC → normalização, incluindo as classes CN/TP/1.17.

Uma leitura atual do calendário FPC 2026 devolveu 435 provas, todas aceites pela normalização: 16 regionais, 29 campeonatos nacionais, 236 provas abertas, 82 Taças de Portugal, 14 internacionais, 3 nacionais e 55 sem âmbito confirmado. Esta verificação fez zero gravações. A aceitação valida o percurso de processamento, não certifica independentemente todos os dados publicados pela fonte.

Estas regras entram em vigor nas próximas recolhas publicadas. Não foi feita uma reclassificação em massa da BD: cada registo volta a ser avaliado quando é recolhido. Os scrapers que apenas recolhem provas futuras não voltam a consultar automaticamente todo o arquivo histórico. A recolha de Classificações.net continua desativada e não foi reativada nesta alteração.
