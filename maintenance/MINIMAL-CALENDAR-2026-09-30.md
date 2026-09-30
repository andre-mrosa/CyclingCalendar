# Calendário com ligações — implementação local

Branch: `refactor/minimal-linked-calendar`.

## Comportamento

Mantém calendário/lista, pesquisa, filtros de datas e categorias, favoritos e exportação ICS dos favoritos. O nome da prova e a ação «Ver original» abrem a página de origem num novo separador. Os URLs antigos `/events/[id]` encaminham para essa página; deixam de apresentar fichas locais.

A lista e a API individual utilizam uma lista explícita de campos: identificador, nome, data, modalidade, âmbito, escalões, licença, região, distrito, fonte e ligação. Não consultam descrições, programas, traduções, contactos dos organizadores, preços, imagens, logótipos, altimetrias, GPX, coordenadas ou resumos históricos derivados. Localizações mais precisas extraídas de programas não são reutilizadas. O distrito é a localização apresentada quando disponível.

As exportações usam os dados básicos e a ligação original. A consulta de marcações Google anteriores continua disponível; criação de novas marcações pela integração, lembretes de inscrições, email de alertas, mapas, meteorologia e distâncias ficam desativados nesta versão. Não foram enviados emails nem alterados calendários externos.

## Remoção das vias de acesso

- Retiradas as fichas e componentes de detalhes; os endpoints de programa, imagens, percursos, tradução e recolha devolvem 410.
- Sitemap apenas com páginas do próprio site; sem URLs de fichas redirecionadas ou URLs de outros sites.
- Ficheiros importados retirados de `public/media/events`; cópia local preservada em `maintenance/backups/imported-media-2026-09-30`, excluída do Git.
- Não foi apagado nem reescrito o histórico Git. Estes ficheiros ainda podem existir em commits anteriores e no repositório remoto.
- Removida a geração de caches PWA de páginas e imagens. O service worker substituto limpa os caches da origem quando o navegador receber a atualização. As chaves antigas do calendário e das comparações de favoritos deixam de ser utilizadas.
- Atualizadas ajuda, descrição SEO e textos legais para refletirem a funcionalidade implementada; isto não constitui certificação jurídica.
- Retirados emails pessoais embutidos nos componentes de conta; a interface consulta o papel atribuído pelo servidor.

## Validação dos destinos

Só são aceites URLs HTTP(S), sem credenciais, portas especiais ou destinos de ficheiros, nos seis domínios de origem revistos tecnicamente. Isso é uma validação técnica de destinos, **não uma licença de reutilização**.

Consulta de leitura em 30/09: 1735 registos históricos, dos quais 75 já em quarentena. A projeção admite tecnicamente 1194; omite 541, incluindo os 75 em quarentena e 466 com destinos fora da lista ou inválidos. Muitos são links de inscrições, formulários ou páginas de outros organizadores. Não foram declarados ilegais: ficam por rever antes de alargar os destinos permitidos. Nenhum evento foi apagado da base de dados.

## Publicação e recolha

**A produção continua fechada e não há cron configurado.** Por instrução do proprietário, os seis adaptadores ficam disponíveis num modo de recolha mínima para revisão posterior: novos registos gravam apenas nome, data, localidade, fonte e ligação à página original. Descrições, imagens, logótipos, programas, PDFs, altimetrias, coordenadas e traduções não são gravados; deep scraping, downloads e tradução continuam bloqueados. O pipeline também deixou de fazer enriquecimento e fusão de conteúdo legado.

Esta alteração técnica **não declara as fontes autorizadas** nem resolve as questões de extração sistemática de bases de dados descritas em [RIGHTS-REVIEW-2026-09-29.md](RIGHTS-REVIEW-2026-09-29.md). Não foi executada uma recolha neste trabalho e não foram feitos pedidos às fontes.

As fichas antigas na base de dados não foram apagadas; esta alteração limita novas gravações e a projeção pública já implementada. A suspensão de produção continua no código, por isso os endpoints de produção permanecem fechados até uma decisão de publicação separada.

Apenas o servidor Next em modo de desenvolvimento, num endereço loopback, permite pré-visualizar esta versão. Builds de produção mantêm a suspensão mesmo quando o hostname é localhost. Esta exceção não é um mecanismo para publicar uma versão privada.

Não foram alterados Vercel, visibilidade do GitHub, dados de produção ou histórico Git. Um futuro lançamento exige decisão separada sobre fontes, dados admitidos e autorização para publicar. A exposição histórica do repositório público e a falha do formulário de contacto continuam pendentes da revisão anterior.

## Verificação

Testes automatizados cobrem a projeção mínima de novas gravações, bloqueio de processamento rico, links inseguros, endpoints retirados, exports e impossibilidade de contornar a suspensão em produção. Build e lint são verificados localmente.

A validação em navegador usa eventos fictícios para evitar pedidos às fontes: larguras de 320, 390, 430 e 1280 px, links externos intercetados, favoritos locais, lista/calendário, exportação ICS e páginas de ajuda, definições e políticas. Não valida autenticação de produção, entrega de emails ou permissões jurídicas.
