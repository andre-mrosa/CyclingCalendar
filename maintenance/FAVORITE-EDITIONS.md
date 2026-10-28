# Novas edições dos favoritos

Em Guardadas, o utilizador pode ativar uma opção global para adicionar novas
edições de todas as provas favoritas. Começa desligada. Funciona localmente
sem conta; com conta, as preferências e exclusões são sincronizadas. Desligar
mantém as edições já adicionadas. Retirar a estrela de uma edição impede a sua
reentrada automática, incluindo registos equivalentes de outras fontes.

A associação exige nome normalizado e modalidade iguais, ano posterior e uma
data não ambígua. Preserva localidades no nome, categorias, distâncias e rondas.
Não usa similaridade aproximada. A única equivalência específica de fonte é
o nome Cabreira «Granfondo Medio Tejo 2» de 2027, confirmado na sua ligação de
origem, com «Granfondo Médio Tejo». Casos desconhecidos ficam por associar.

## Publicação

Aplicar a migração aditiva `20261028000000_favorite_editions` antes do código:
`npx prisma migrate deploy`. Cria apenas `FavoriteEditionPreference` e um índice.
A migração foi aplicada à base configurada em 28/10/2026. Não altera provas,
favoritos manuais ou subscrições antigas.

O calendário subscrito inclui as edições automáticas e respeita as exclusões.
A eliminação da conta remove também esta preferência e mensagens pendentes.

## Email opcional

Exige três variáveis no servidor: `RESEND_API_KEY`, `CRON_SECRET` e
`EDITION_ALERTS_FROM_EMAIL`, por exemplo `Cycling Calendar <avisos@cyclingcalendar.pt>`.
O domínio desse remetente tem de estar verificado no Resend, com os registos DNS
que o serviço fornece. Não é necessária uma caixa de correio para enviar;
receber respostas exige configuração de receção ou reencaminhamento.
Nunca usar o remetente de testes `onboarding@resend.dev` com utilizadores.

Enquanto faltar configuração, a interface indica que o remetente está por
configurar e não permite ativar email. Cada conta tem de optar separadamente
pelos avisos e verificar o email principal no Clerk. Não importa consentimentos
dos alertas antigos. Não foram enviados emails reais durante esta implementação.

O cron `/api/cron/favorite-editions` está agendado para 03:30 UTC diariamente,
depois da recolha das 02:00. Exige `Authorization: Bearer <CRON_SECRET>`.
Processa até 100 contas por execução, das menos recentemente verificadas para
as mais recentes. Acima desse volume, a frequência por conta é menor e será
necessário aumentar a capacidade. Não existe uma promessa de aviso imediato.

Só envia novidades posteriores à ativação, no máximo um resumo por dia de
calendário em Lisboa. Novas séries guardadas estabelecem uma referência sem
enviar avisos retroativos. O conteúdo inclui nome, data publicada, ficha da
prova e ligação para gerir as opções. Não anuncia preços, vagas ou inscrições
abertas sem confirmação.

Uma reserva temporária evita processamentos simultâneos. A mensagem pendente
e a chave de idempotência são persistidas antes do envio. Falhas reutilizam
exatamente o mesmo conteúdo e chave; após 23 horas, devolve `needs-review` e
HTTP 503 para revisão, evitando repetir uma entrega incerta fora da janela de
idempotência do fornecedor. Não apagar pendências sem verificar a entrega no
Resend. Alterar favoritos, email verificado ou consentimento invalida pendências.

Verificação: `npm test`, `npm run lint` e `npm run build`. Os testes de entrega
usam um fornecedor simulado e não enviam email. As opções começam desligadas.
