# Revisão de fontes e condições para relançamento — 29/09/2026

Estado: **NÃO RELANÇAR**. O responsável suspendeu o projeto na Vercel. Confirmado HTTP 503 / DEPLOYMENT_PAUSED. Não foi feito push, deploy ou reativação após essa instrução.

Esta é uma auditoria técnica e uma leitura dos documentos públicos encontrados, não um parecer jurídico nem uma garantia de ausência de responsabilidade. O utilizador confirmou que não tem autorizações das fontes. A aplicabilidade contratual, direitos sobre cada obra/base de dados e eventuais exceções exigem avaliação jurídica em Portugal.

## O problema concreto

O produto não recolhe apenas datas: os importadores copiam descrições, programas, imagens, logótipos e altimetrias; alguns descarregam ficheiros para `public/media/events`. Os termos do próprio Cycling Calendar, a atribuição da fonte e a ausência de fins comerciais não concedem licenças sobre estes conteúdos.

À data da revisão, havia 60 ficheiros de eventos no Git e o repositório era público. A pausa da Vercel não retira esses ficheiros do GitHub. Foi pedida autorização para tornar o repositório privado. Não foi apagado nem reescrito o histórico.

## Resultado por fonte

| Fonte | Evidência encontrada | Conclusão operacional |
| --- | --- | --- |
| Stop and Go | [Termos, cláusulas 14.1–14.3](https://stopandgo.net/terms): direitos sobre conteúdos e bases de dados; reprodução e outras formas de exploração dependem de consentimento escrito; licença limitada ao uso pessoal. | A republicação atual sem autorização apresenta conflito claro com as condições publicadas. Recolha e republicação bloqueadas até autorização/validação. |
| Cabreira Solutions | [Aviso legal, secção 3](https://cabreirasolutions.com/aviso-legal/): exige autorização escrita para reprodução, distribuição, modificação ou utilização. Existe um [kit de imprensa](https://cabreirasolutions.com/kit-de-imprensa/) com materiais promocionais, mas não foi demonstrada uma licença geral para o importador. | Não tratar a existência do kit como autorização para copiar todo o site. Confirmar por escrito os materiais, usos e condições permitidos. |
| Apedalar | [Termos, secção 7](https://apedalar.pt/termos-e-condicoes): reprodução, distribuição ou modificação exigem autorização prévia. Secção 4 restringe a disponibilização de listas de participantes. | Recolha e republicação bloqueadas. Não importar listas de participantes. |
| FPC | A página de [termos](https://www.fpciclismo.pt/termos-condicoes) consultada apresenta essencialmente o título, sem condições substantivas visíveis. A [política de privacidade](https://www.fpciclismo.pt/politica-privacidade) não é uma licença de conteúdos. | Não foi encontrada autorização geral de reutilização. Ausência de texto não equivale a autorização. Bloqueada até esclarecimento. |
| Recorde Pessoal | [Política de privacidade](https://www.recordepessoal.pt/politica-de-privacidade) regula dados pessoais; o rodapé reserva direitos. Não foi localizado um documento separado que conceda reutilização geral de conteúdos. | Autorização não demonstrada. Bloqueada até esclarecimento. |
| Classificações.net | [Termos de uso](https://www.classificacoes.net/termos-de-uso) proíbem usos ilícitos e abuso dos servidores, mas não concedem uma licença geral de republicação. | Autorização não demonstrada. O importador inspecionado cria sobretudo ligações para resultados; isso não permite concluir que todos os usos estejam autorizados. |

As políticas de privacidade das fontes regulam o tratamento dos seus dados; não transferem para este projeto o direito de tratar dados pessoais ou reutilizar obras. Se descrições/documentos incluírem nomes, contactos ou classificações de pessoas, é necessária uma análise própria de finalidade, fundamento, minimização e transparência. Não foi feita uma inspeção integral de todos os documentos históricos.

## robots.txt: sinal técnico, não licença

Verificado por pedidos diretos em 29/09/2026:

- FPC: `/robots.txt` devolveu 404.
- Cabreira: restringe áreas administrativas, logs e alguns caminhos WooCommerce.
- Stop and Go: restringe `/api/`, `/livewire/`, `/account/`, `/admin/`, páginas de inscrições de eventos, atletas e pesquisas.
- Apedalar: restringe `/admin`, `/speaker`, `/media` e `/download`.
- Recorde Pessoal: restringe `/admin/`.
- Classificações.net: restringe `/backups/`, `/ajax/`, `/templates/` e URLs terminados em `.php`.

Não foi identificada autorização jurídica nos ficheiros robots. Os caminhos e subdomínios de cada ficheiro devem ser avaliados separadamente. Não contornar bloqueios, autenticação, CAPTCHA ou limites de acesso.

## Contenção preparada no código, sem publicação

- Publicação bloqueada por defeito em `contentReleasePolicy.js`; nenhuma variável de ambiente reativa silenciosamente o serviço.
- Middleware cobre páginas, APIs, feeds, ficheiros estáticos e callbacks de workflows; devolve indisponibilidade sem conteúdos importados.
- Todos os importadores das seis fontes recusam execução antes de fazer pedidos. Downloads de imagens/GPX e tradução em lote também ficam bloqueados.
- Agendamentos retirados de `vercel.json` na versão local. A configuração remota não foi alterada; o projeto remoto continua pausado.
- Preparada resposta de atualização do service worker que limpa caches desta origem quando um navegador voltar a conseguir obter a atualização. Enquanto a Vercel estiver pausada, não é possível entregar essa atualização.
- Dados, ficheiros e histórico preservados para inventário e análise. Nenhuma eliminação em massa foi executada.

Uma pausa, privatização ou remoção não recupera cópias já descarregadas. O Google e outros serviços podem conservar referências ou cópias. Rever no Search Console as URLs efetivamente indexadas e, se necessário, solicitar remoção temporária; isto não substitui resolver a publicação na origem.

## Modelo proposto para substituir a recolha atual

1. **Publicação por autorização, não por disponibilidade pública.** Nenhuma fonte entra automaticamente por não ter proibições visíveis.
2. **Submissão direta por organizadores**, com identidade verificada, confirmação de poderes sobre cada material e licença de publicação com âmbito definido. A redação da licença deve ser validada juridicamente.
3. **Feeds ou API acordados por escrito**, incluindo frequência, campos autorizados, armazenamento, cache, atribuição e retirada.
4. **Proveniência por evento e por ficheiro**: titular, URL de origem, documento de autorização, versão/data, usos permitidos, validade e eventual revogação. Um evento fundido não herda automaticamente a autorização de outra fonte.
5. **Campos independentes**: autorização para nome/data/local não implica autorização para fotografias, mapas, logótipos, GPX, tradução ou redistribuição por ICS/API.
6. **Revisão dos 1660 eventos históricos** e dos 60 ficheiros versionados antes de qualquer migração para o novo catálogo. Não republicar automaticamente descrições, traduções, imagens ou resumos derivados.
7. **Correções e retirada** com contacto operacional e registo do pedido. Revogar também ficheiros, metadados sociais, feeds, sitemap e caches; prever redirecionamentos apenas quando não voltarem a expor conteúdo indevido.

Um calendário apenas com factos e links pode reduzir o uso de obras de terceiros, mas não constitui uma autorização geral para extração sistemática de bases de dados. Não se recomenda relançá-lo como solução juridicamente garantida sem revisão.

## Condições mínimas para ponderar relançamento

- Parecer jurídico sobre os usos já efetuados e sobre o novo modelo, incluindo direitos de autor, bases de dados, marcas e dados pessoais.
- Autorizações documentadas ou outra base jurídica validada, por fonte e por tipo de material.
- Catálogo revisto e separado dos conteúdos históricos sem autorização.
- Contacto de privacidade funcional: o teste autorizado de 29/09 devolveu HTTP 502; não houve confirmação de envio.
- Definição de retenção, eliminação, cópias de segurança, fornecedores e transferências internacionais.
- Testes de recusa por defeito e de revogação em todas as saídas públicas.
- Aprovação explícita do responsável antes de qualquer push que desencadeie deploy e antes de reativar a Vercel.

## Prioridade das próximas melhorias

P0: conter publicação, verificar visibilidade do repositório, resolver contacto, obter orientação e autorizações.

P1: catálogo de permissões e painel de revisão; submissões de organizadores; fluxos de retirada e exportação/eliminação de dados.

P2: medir cobertura de informação autorizada por evento, melhorar páginas de fontes, validar acessibilidade completa e desempenho. Novas funcionalidades de pesquisa, alertas e distribuição ficam subordinadas a este trabalho.

Referência de enquadramento: [WIPO — copyright](https://www.wipo.int/en/web/copyright/faq-copyright), [RGPD](https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32016R0679). As conclusões por fonte acima baseiam-se nos documentos ligados em cada linha, não numa certificação de conformidade.

## Validação técnica da contenção

- 183 testes automáticos passaram, incluindo recusa de fontes e verificação de que entradas de recolha/download não fazem pedidos de rede quando bloqueadas.
- Build de produção concluído; a seguir foram acrescentadas guardas às entradas adicionais de manutenção, tradução e tentativas de recolha, novamente verificadas pela suite de testes.
- Servidor local compilado: páginas, API de eventos, cron, sitemap, detalhe, imagem importada, favicon, otimizador de imagens e callback de workflow devolveram HTTP 503 sem cache. O service worker devolveu a rotina de limpeza prevista.
- Nenhuma destas verificações publicou alterações ou executou uma limpeza dos dados de produção.
