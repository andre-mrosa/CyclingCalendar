# Pesquisas, alertas e verificação de fontes

## Publicação

1. Aplicar a migração `20260925000000_search_alert_freshness` pelo procedimento em `maintenance/DATABASE.md`, antes de publicar o código.
2. Gerar o cliente Prisma e publicar normalmente.
3. Configurar `RESEND_API_KEY`, `ALERTS_FROM_EMAIL` (remetente num domínio verificado no Resend) e `CRON_SECRET` no alojamento. Não usar o remetente de testes do Resend para destinatários reais.
4. Confirmar a tarefa de `vercel.json`: `/api/cron/alerts`, de hora a hora. Exige `Authorization: Bearer <CRON_SECRET>`.

Publicar não ativa subscrições. Cada utilizador tem de ativar os alertas em Guardadas. Envia para o email principal verificado da conta Clerk. É possível escolher alterações, prazos ou ambos e desativar o resumo. Há no máximo um resumo por 24 horas, só com novidades. Os prazos entram nos três dias anteriores ao fecho, em hora de Lisboa, uma vez por prazo. Emails em português ou inglês, segundo a preferência de idioma.

Usa os favoritos sincronizados com a conta, até 500 por conta. Lotes de 100 contas por execução, começando pelas menos recentemente verificadas. Alterações locais aos favoritos só entram depois da sincronização.

## Falhas de envio

Uma reserva por conta evita execução concorrente. Cada mensagem pendente guarda o conteúdo e chave de idempotência. Tentativas reutilizam ambos; falhas não avançam o snapshot. Falhas de Clerk/BD não equivalem a favoritos vazios.

Entregas incertas há mais de 23 horas devolvem `needs-review`/HTTP 503. Não são reenviadas automaticamente depois da janela de idempotência do fornecedor. Verificar no Resend pela chave `pending.id`: se entregue, confirmar o snapshot pendente e limpar a mensagem; se não entregue, limpar apenas a mensagem pendente para permitir nova tentativa. Confirmar sempre o estado no fornecedor antes da recuperação.

A configuração local não tinha remetente de alertas nem segredo de cron. Não foram enviados emails reais. A migração foi aplicada com sucesso à base de dados de produção em 25/09/2026.

## Pesquisas

Guardadas no navegador, separadas por conta/visitante, até 20. O URL inclui filtros reconhecidos, página, fontes e, quando se filtra por distância, as coordenadas da origem. O painel informa antes da partilha. As preferências globais do destinatário são preservadas. Links de Guardadas/Agenda continuam dependentes da conta de quem os abre; não publicam a lista privada de outra pessoa.

## Atualidade

`lastVerifiedAt` e `lastVerifiedSource` só são preenchidos por recolhas bem-sucedidas, incluindo consultas às listagens. Não confirmam todos os campos junto do organizador. Registos antigos ficam sem verificação até nova recolha. Edições administrativas e traduções não atualizam esta data. Fusões mantêm a verificação mais recente. Prazos desconhecidos não são tratados como inscrições abertas.

## Validação mobile

`maintenance/verify-mobile.cjs` usa fixtures locais em 320, 390 e 430 px: guardar/partilhar pesquisa, reabrir filtros pelo URL, ficha com inscrição desconhecida e fonte, fechar ficha e expandir filtros. Verifica erros JavaScript e overflow horizontal, guardando capturas em `maintenance/mobile-review/`.

Usa Playwright (`PLAYWRIGHT_PACKAGE` pode indicar o caminho do pacote) e Edge. Não valida entrega real de email, autenticação real nem um dispositivo iOS físico.
