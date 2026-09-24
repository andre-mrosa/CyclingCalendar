# Correções e validação — 24/09/2026

Este documento substitui o resultado inicial dos relatórios QA de 23/09.

## Correções

- Downloads GPX limitados à pasta e extensão previstas, incluindo validação do caminho real; pedidos externos validam DNS/IP, fixam o IP da ligação e validam cada redirecionamento, com limite de tamanho e tempo.
- Proxy de imagens só serve formatos raster reconhecidos pelo conteúdo e envia `nosniff`; não publica HTML/SVG externo como conteúdo ativo da aplicação.
- Sanitização HTML por biblioteca dedicada na recolha e na leitura de detalhes. São mantidas imagens raster base64 legítimas; protocolos ativos e handlers são removidos. O programa público é apenas leitura.
- Botões de favoritos recuperaram a classe, prioridade de clique, nome traduzido e estado acessível. Traduções de localização e distância adicionadas nos quatro idiomas.
- Validação de anos/fontes, JSON e limites de tradução; formulário de contacto valida campos, escapa HTML e usa a opção correta de reply-to do SDK.
- Fontes novas incluídas por defeito; preferências personalizadas preservadas. Métricas de Apedalar incluídas e fixtures da sincronização atualizadas para as novas fontes.
- Histórico PostgreSQL completo e testado. Coluna de resumo e trigger aplicados na BD configurada, com 1.729 resumos preenchidos sem substituir os dados originais.
- Listagem lê resumos, com cache na origem de 60 segundos e URLs de fontes normalizadas. Stats de administração deixam de atualizar automaticamente por defeito; atualização opcional e notificações passam a 60 segundos, com suspensão quando não visíveis.
- Next.js 16.3.6, Workflow 4.8.9 e dependências transitivas corrigidas. `npm audit` reporta zero vulnerabilidades.

## Verificações concluídas

- 148 testes unitários/regressão aprovados, zero falhas.
- ESLint sem erros.
- Build de produção concluído com as dependências corrigidas.
- Prisma generate; baseline comparado com schema real sem diferenças antes da migração; instalação das duas migrações e invalidação testadas num schema descartável com rollback.
- Auditoria de dependências: 30 vulnerabilidades antes, zero depois.
- Login e registo montam os formulários Clerk após hidratação, corrigindo a divergência SSR observada no WebKit. Downloads ICS mantêm o blob disponível enquanto o Safari inicia a leitura.
- Fluxos com contas Clerk de teste em desktop, Android e WebKit: login, favoritos associados à conta, subscrição ICS e revogação, permissões de utilizador/admin e logout. As contas temporárias foram eliminadas.
- Cinco secções de administração abertas e verificadas nos três perfis; atualização automática de estatísticas desativada inicialmente.
- Service worker de produção: favoritos offline, recarregamento offline, menu móvel e reconexão aprovados.
- Larguras de 320/390/768/1024 px e resposta 503 simulada com preservação do calendário em cache aprovadas.
- Bateria de 17 páginas, APIs públicas/protegidas, pesquisa, favoritos, exportação ICS, detalhe, tema e navegação móvel: desktop e Android sem erros de JavaScript; repetição final WebKit com 41 verificações aprovadas e zero falhas, incluindo login e registo.
- Uma passagem anterior do build final registou um erro de rede WebKit no pedido de eventos durante navegações rápidas (85 verificações aprovadas, uma falha na asserção de zero erros). Não se repetiu na execução WebKit instrumentada; houve cancelamentos de recursos Clerk ao mudar de documento. O registo original foi mantido em `qa-final-runtime.log`, e a repetição em `qa-final-webkit-diagnostic.log`.

## Tráfego

A primeira abertura instrumentada recebeu 993.128 bytes para 1.654 provas e
268.673 bytes para 1.605 traduções: **1.261.801 bytes**, contra **16.001.926 bytes**
antes. Redução de aproximadamente **92%**, incluindo agora duas fontes adicionais.
A listagem no navegador continua perto de 1,3 MB antes da compressão; a poupança
principal é no tráfego BD → servidor, não no tamanho do JSON.

Os contadores pertencem ao stream do cliente PostgreSQL, não ao painel de
faturação. A navegação interna por oito páginas, a pesquisa e 35 segundos de
inatividade não repetiram consultas de eventos. Recarregamento e nova aba dentro
do prazo da cache também não consultaram novamente a BD. A versão em
produção anterior já tinha cache CDN funcional (MISS seguido de HIT).

## Evidências locais

Os logs `qa-fix-*`/`qa-fixed-*` e os artefactos em `.qa-tools/fixed-2026-09-23/`
contêm o detalhe dos testes. São artefactos locais ignorados pelo Git. As
regressões reproduzíveis estão em `tests/`; as instruções de migração estão em
`maintenance/DATABASE.md`.

## Âmbito e publicação

O build corrigido foi validado em produção local. A migração e o preenchimento
dos resumos foram aplicados na base de dados configurada. A publicação foi
autorizada após esta validação e segue a integração de `master` com a Vercel.
OAuth real da Google e entrega de email não foram exercitados. O formulário de
contacto foi testado com envio simulado. A sincronização tem testes de regressão,
mas não foi iniciada uma recolha integral dos sites externos durante esta validação.
