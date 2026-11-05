# Inscrições e diagnóstico de notificações — 5 de novembro de 2026

## Alterações

- Google Calendar e ICS: abertura e fecho de inscrições recebem cinco avisos, 10080, 1440, 360, 60 e 0 minutos antes. Os avisos da prova não mudam.
- Lembretes mensais conservam a indicação de previsão e o dia 1 como referência de dia inteiro. Os avisos são relativos a essa referência, não a uma abertura confirmada.
- Botão em As minhas provas → Google Calendar e alertas permite atualizar apenas os avisos dos lembretes de inscrição já existentes no calendário Cycling Calendar da conta autenticada. Não altera datas nem eventos de provas.
- Ícone das inscrições lê o estado real do Google, reconhecendo identificadores com hífen e underscore e aliases das fontes. Se existir, mostra estado guardado e permite remover com confirmação; se a data guardada divergir, oferece atualização.
- Consultar e adicionar um lembrete reconhece os dois formatos, evitando duplicados novos. Uma alteração confirmada pode atualizar o lembrete estimado existente. Eventos antigos duplicados não são apagados automaticamente.
- Correção da leitura do calendário: lembretes com hífen deixam de ser confundidos com provas e conflitos de datas.
- Email de alterações passa a incluir abertura/fecho de inscrições, incluindo mês previsto → dia exato e desconhecido → publicado. Introdução dos novos campos cria uma referência sem enviar mudanças históricas. Mantém o limite de um resumo diário, consentimento e mecanismos de idempotência.
- Diagnóstico push: teste dos dispositivos ativos da própria conta, limitado a uma tentativa por minuto por dispositivo. Regista apenas contagens, sem endpoints/chaves. Aceitação pelo serviço não prova receção no telemóvel.

## Diagnóstico anterior à publicação

Na conta usada na sessão: seguimento de edições e email ativos; email de alterações ativo, sem envio pendente; última verificação em 5 de novembro e último envio de alterações registado em 3 de novembro. Os agendamentos de alterações e push continuavam a executar.

Dois dispositivos FCM ativos, horário 10:00 Europe/Lisbon. As push existentes são resumos de novas edições, não de qualquer atualização de uma prova nem dos cinco avisos de calendário. Uma subscrição criada depois da hora escolhida aguarda o dia seguinte e só envia se houver novidades. Não se pode concluir receção Android apenas pela presença da subscrição ou por checkedAt.

A configuração local de autenticação não identifica a mesma conta que a sessão de produção. O diagnóstico válido usa o identificador da sessão conhecido e a BD; não se inferem falhas de produção a partir de variáveis locais ausentes.

## Verificação

460 testes, lint e compilação passaram. Testes sem envio de emails reais nem alterações de calendários reais: cinco alarmes; correspondência e exclusão de inscrições por ambos os separadores; origem e autenticação; atualização apenas dos lembretes próprios; snapshots e email de mês para data exata, sem repetição; isolamento e limitação do teste push.

Publicação seguida de verificação na sessão real; confirmação no Android depende da resposta do utilizador ao teste. Adicionar o lembrete MQ só é um marco de planeamento; não efetua inscrição.
