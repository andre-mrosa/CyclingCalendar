# Revisão da app — 29 de outubro de 2026

## Atualização da app instalada

- A PWA verifica a versão publicada ao abrir, voltar ao primeiro plano ou recuperar ligação e a cada cinco minutos enquanto visível.
- Uma nova versão atualiza a página automaticamente quando não há edição nem diálogos abertos. Nas páginas de contacto, autenticação e administração, ou durante edição, aparece um botão para atualizar.
- A proteção por sessão evita ciclos de recarregamento. Se o armazenamento estiver indisponível, a atualização fica manual.
- O service worker é atualizado sem reutilizar a cache HTTP. O calendário também se atualiza quando termina uma sincronização ou muda um registo, sem exigir uma nova instalação.
- Quem ainda tem uma versão anterior precisa de abrir/recarregar a app uma vez para receber este mecanismo. A app precisa de ligação para obter atualizações; a entrega de push continua sujeita ao sistema do dispositivo.

## Dados, filtros e escalões

Inventário inicial: 1 771 registos armazenados; 1 662 registos públicos, sem duplicados na seleção pública. Há arquivo histórico e registos em quarentena; não foram apagados favoritos nem recriados identificadores.

Foram aplicadas 79 correções de metadados confirmáveis: âmbito, modalidade, licença e escalões. Plano e valores anteriores guardados localmente em `.qa-tools/full-review-2026-10-29/facts-plan.json`; a aplicação usou verificação de `updatedAt` e preservou IDs e datas.

- «Geral / Aberto» e categorias serializadas passam a funcionar nos filtros de idade.
- Taças regionais de XCM deixam de ser classificadas como Taça de Portugal; taças mundiais/europeias são internacionais.
- Um GP de um dia deixa de ser apresentado como prova por etapas. Datas não confirmadas não são afirmadas como provas de um dia.
- Provas que atravessam meses aparecem nos meses abrangidos, incluindo mudanças de ano.
- O assistente permite escolher a época e corrige as fronteiras etárias de Juvenis, Cadetes e Sub-23. A sugestão é um filtro, devendo as regras de participação ser confirmadas na fonte.
- A recolha mínima preserva classificações factuais validadas e datas publicadas de inscrições. Não importa descrições, imagens, preços ou programas.
- Favoritos reconhecem uma nova edição mesmo quando um registo antigo tinha apenas uma modalidade genérica, mantendo a separação entre especialidades explícitas.
- A grafia «Grandfondo» publicada por algumas fontes é reconhecida como a mesma série «Granfondo», preservando o título original apresentado.

## Scrapers e manutenção

- FPC: verificados os calendários completos de 2026 (435 entradas na fonte) e 2027 (ainda sem entradas). Mantida a validação que rejeita respostas da época errada ou apenas do mês atual.
- Apedalar: consulta o ano atual e o seguinte; anteriormente podia perder a época seguinte.
- Cabreira: lê o título publicado em vez de depender de números/sufixos do URL; mantém os IDs existentes nas fusões.
- Cabreira: exclui provas explicitamente pedestres. As duas São Silvestre (Oeste e Algarve), confirmadas na origem como corrida/caminhada, passaram para quarentena reversível. Corrigidas também as modalidades de Gravel Montijo e Granfondo Serra d’Ossa; valores anteriores em `cabreira-facts-plan.json` na pasta local de diagnóstico.
- Stop and Go: descobre modalidades de ciclismo pela listagem pública, incluindo URLs sem ano, e normaliza URLs de inscrição antes de deduplicar. Paginação e pedidos têm limites; 401/403/429 interrompem a recolha bloqueada em vez de insistir indefinidamente.
- Cabreira, Recorde Pessoal e Apedalar: tempos máximos de pedidos limitados para evitar execuções presas.
- A duração final corresponde ao workflow completo. Erros de fontes permanecem visíveis como execução parcial.
- O painel soma também os detalhes de criados, atualizados e fundidos da FPC entre épocas; uma época seguinte vazia já não apaga os números da anterior. Resumos repetidos não duplicam as contagens.
- Removido o tradutor automático de conteúdo de provas que já não é publicado. A etapa passa a validar os quatro idiomas da interface.
- Removida a opção administrativa de recolha histórica que já não tinha efeito. O script de reparação foi ajustado ao parser atual.

**Limitações verificadas:** algumas listagens/páginas do Stop and Go devolveram HTTP 403 no ambiente local; não se contornou o bloqueio. Na execução em produção, a fonte respondeu normalmente e processou 15 provas sem erros. Três registos têm intervalos incoerentes ou de duração excessiva na fonte e continuam com data a confirmar: `sg_taca-regional-de-xcm-trofeu-meia`, `sg_race-nature-vieira-minho` e `sg_desafio-acdl-2027`. Não foram inventadas datas.

## Idiomas, interface e segurança

- Completadas traduções das definições, descrições de fontes, contacto, rodapé, textos legais e secção de exploração/ajuda da página principal em português, inglês, espanhol e francês. Nomes próprios e nomes originais das provas são preservados. URLs e metadados SEO mantêm a língua principal portuguesa.
- Corrigidas traduções de modalidades/especialidades presentes nos dados e nomes de escalões.
- Controlos de visibilidade passaram a botões acessíveis por teclado com estado de interruptor.
- Os assistentes em diálogo são identificados como modais para suspender atualizações automáticas. No telemóvel, o assistente de escalões usa uma única área de deslocamento, sem duplicar a moldura e o espaço interior do diálogo.
- Separadas as caches do calendário geral e das coleções para impedir que dados iniciais de uma coleção contaminem outra.
- A versão dos dados integra também a chave da cache no servidor, evitando guardar uma resposta antiga sob o URL de uma versão nova.
- Next.js atualizado para 16.4.3 e dependências compatíveis corrigidas. `npm audit` completo: **0 vulnerabilidades reportadas** na verificação de 29/10/2026.

## Verificação

- `npm test`: **248 testes aprovados**, zero falhas.
- `npm run lint`: aprovado.
- `npm run build`: aprovado com acesso à base de dados, sem falhas de geração das páginas.
- Verificação no browser das definições, calendário e textos legais, incluindo formato mobile e quatro idiomas; sem transbordo horizontal nas páginas verificadas.
- A permissão e entrega reais de notificações num iPhone/Android instalado exigem teste nesse dispositivo; não se considera uma emulação de largura como prova de entrega push.

## Execução real em produção

Workflow `30217c50-700f-4b56-8a2b-e560119c0abc`: iniciado às 14:10:20 UTC, concluído às 14:15:22 UTC com estado **success**, duração 302,6 segundos e zero erros.

| Fonte | Registos processados | Novos registos |
| --- | ---: | ---: |
| FPC 2026 | 17 | 2 |
| FPC 2027 | 0 | 0 |
| Cabreira | 10 | 1 |
| Stop and Go | 15 | 1 |
| Recorde Pessoal | 2 | 0 |
| Apedalar | 14 | 3 |

A recolha FPC processa nesta execução as provas ativas/futuras; 435 corresponde às entradas da época completa consultadas na auditoria, não a novas provas importadas. As atualizações e fusões preservaram os identificadores existentes.

As etapas de validação dos quatro idiomas e invalidação da cache concluíram com sucesso. Verificação pública após a execução: 1 667 entradas e 1 667 IDs únicos, sem registos de quarentena, sem as São Silvestre e sem conteúdo editorial/imagens antigas. O Médio Tejo 2027 manteve o ID anterior, com título e intervalo de datas atualizados da fonte.

Os ficheiros de diagnóstico e cópias anteriores permanecem em `.qa-tools`, ignorados pelo Git. Não contêm novas credenciais nem são publicados no site.
