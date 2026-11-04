# Acesso às fontes — 4 de novembro de 2026

## Causas confirmadas

Stop and Go devolveu HTTP 429 nas execuções observadas. O scraper anterior fazia quatro pedidos de detalhes em paralelo, além da descoberta de listagens e sitemaps. O limite exato do servidor não é conhecido. Não se contornam recusas de acesso.

Três URLs do sitemap Apedalar redirecionam para a página inicial: `taca-oeste-xcm-2027-batalha-do-vimeiro`, `4a-edicao-do-open-torres-vedras-xcm` e `taca-oeste-xcm-2027-cas-runa`. Ao seguir automaticamente o redirecionamento, o código lia «PRÓXIMOS EVENTOS» e reportava incorretamente uma data não reconhecida.

## Correções

- Uma fila por etapa Stop and Go aplica pelo menos dois segundos entre pedidos ao sitemap, listagens e detalhes. As páginas das listagens atuais de ciclismo têm prioridade, preservando todos os candidatos adicionais do sitemap.
- Um HTTP 401/403/429 interrompe a fonte. `Retry-After`, em segundos ou data HTTP, define o próximo instante permitido. Sem valor válido, o intervalo conservador é uma hora para 429 e 24 horas para 401/403.
- O intervalo de recusa é persistido na linha `operational-stopandgo-access` de SystemLog, separada dos logs visíveis e protegida contra limpeza. Guarda apenas estado HTTP e instante de nova consulta. A primeira execução atualizada também respeita uma recusa recente registada pela versão anterior. Falha de leitura do estado operacional impede emitir pedidos.
- Cada bloco processa no máximo 60 páginas ou cerca de três minutos. O workflow persiste URLs, posição, resultados factuais, métricas, duração, instante mínimo do pedido seguinte e erros entre blocos. A retoma automática não repete a descoberta nem páginas já concluídas. A medição de qualidade é emitida no fim da fonte e abrange todos os blocos; erros anteriores continuam a tornar a execução parcial.
- A descoberta tem um limite de tempo próprio para não ultrapassar a duração do servidor. Um catálogo extraordinariamente extenso ou uma alteração da fonte continua a produzir uma recolha incompleta explícita. O workflow conserva o limite global de 36 etapas.
- Apedalar lê redirecionamentos de forma explícita. Destinos fora das páginas de prova são classificados como indisponíveis sem descarregar a página inicial/listagem. Redirecionamentos válidos entre páginas da própria fonte são seguidos com limites e deteção de ciclos. Páginas genéricas sem data também são identificadas; uma data inválida numa página real continua a ser uma falha de leitura.
- Estes casos alimentam `coverage.unavailable` e avisos de qualidade, sem apagar provas existentes nem adivinhar datas pelos títulos/URLs.

## Validação

Regressões cobrem serialização/intervalos, passagem entre blocos, Retry-After e reinício do servidor, recusa anterior à publicação, ausência de pedidos em caso de falha de BD, redirecionamentos externos/iniciais, destino canónico válido, ciclos, contagens de indisponibilidade, retoma sem duplicações e métricas/erros acumulados no workflow. A limpeza de logs conserva as duas linhas operacionais.

Leitura factual limitada da Apedalar com o helper novo: as três URLs antigas ficam indisponíveis; uma prova conhecida conserva a data publicada. Não são guardados corpos de páginas nem fabricadas provas. Uma correção do cliente não garante que a fonte Stop and Go passe a aceitar pedidos: o próximo teste em produção deve respeitar o período de espera e apresentar qualquer nova recusa como tal.
