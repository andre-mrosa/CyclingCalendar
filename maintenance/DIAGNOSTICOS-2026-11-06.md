# Diagnóstico de inscrições, email e Android

## Quatro páginas Stop and Go

Foram consultadas apenas as quatro páginas que falharam, com cinco segundos entre pedidos. As quatro responderam HTTP 200; não foi repetida a recolha completa.

- Desafio ACDL 2027 publica 17 JUL 2027 a 18 JUL 2028. O intervalo é contraditório para uma prova e continua sinalizado; não se corrige o ano por suposição.
- Granfondo Senhora da Graça 2019 publica 6 SET 2019 a 6 JUN 2019, com a ordem invertida. Está fora das épocas abrangidas.
- Meia Maratona de Guimarães publica datas de junho de 2019 e não apresenta modalidade no cabeçalho. Está fora das épocas abrangidas.
- Taça regional XCM/Troféu Meias Maratonas ARCVR publica 22 MAR a 5 JUL 2026: um intervalo de época, já passado, e não uma única prova contínua.

A classificação passa a excluir datas explicitamente antigas antes de exigir uma modalidade/range de prova válido. Os limites dos anos são verificados sem descartar intervalos que abranjam anos pedidos. O erro de datas futuras inválidas inclui o intervalo publicado. Os testes reproduzem estes quatro casos com factos mínimos.

## Email de teste

Definições inclui envio e consulta de entrega do próprio teste. O POST exige sessão autenticada, origem da app e email principal verificado no Clerk. O destinatário não é aceite do cliente. Usa o mesmo Resend/remetente configurado para avisos, com uma reserva atómica de quinze minutos por conta e chave de idempotência. Não ativa subscrições nem simula alterações a provas.

O estado «aceite» significa que o prestador aceitou o envio; «delivered» significa entrega ao servidor de destino, não confirmação de leitura. A consulta só acede ao ID de envio guardado na conta autenticada. Os registos operacionais não guardam o destinatário.

## Android

Ferramentas oficiais instaladas apenas em `.qa-tools/android`, sem instalar o IDE. A aceleração WHPX está disponível. Os resultados dos ensaios no dispositivo virtual serão registados após o arranque; isto não substitui testes no telemóvel físico.
