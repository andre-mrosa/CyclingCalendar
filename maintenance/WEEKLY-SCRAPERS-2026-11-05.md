# Frequência semanal das fontes

Por pedido do proprietário, as cinco fontes principais passam de diário a semanal: quarta-feira às 01:00 UTC (`0 1 * * 3`), equivalente a 01:00 no inverno e 02:00 no verão em Portugal continental. O proprietário esclareceu que pretendia uma janela de menor procura na internet/fonte, não no próprio site. A madrugada portuguesa é uma escolha operacional de menor procura provável da fonte; não foi medido um mínimo de tráfego mundial, nem a escolha depende das estatísticas do Cycling Calendar.

O plano weekly anteriormente só consultava a FPC; passa a incluir FPC, Cabreira, Stop and Go, Recorde Pessoal e Apedalar, o ano atual e o seguinte. O cron diário foi removido. MQ Series e Bairrada mantêm a recolha mensal no dia 1 às 05:00 UTC. Emails e push mantêm a sua periodicidade, pois não são recolhas às fontes.

As continuações da mesma recolha e a retoma limitada após HTTP 429 continuam a respeitar o período de espera e o minuto adicional já pedido. Não se consulta uma fonte durante o bloqueio. Uma execução semanal não garante que a origem deixe de recusar acesso.

O painel passa a permitir «Executar apenas Stop and Go», com a mesma autenticação administrativa, reserva e workflow persistente das restantes recolhas. Não inicia as outras fontes. Esta opção é usada para a verificação manual autorizada em 5 de novembro, após o termo da espera registada às 15:15.

A revisão visual do painel coloca o resultado e as fontes em primeiro plano, com os agendamentos semanal/mensal numa coluna secundária. Os organizadores têm margens, datas identificadas e listas de provas recolhíveis. Botões, cartões e estados usam os estilos partilhados do painel. Durante uma continuação com avisos, a fonte distingue «A recolher · com avisos» de um resultado final; quando há cobertura disponível, mostra páginas analisadas e progresso.

## Resultado da execução manual

Execução `a7f82bef-ff90-486f-afe2-a5d6be3cce79`, iniciada em 5 de novembro às 15:37 e terminada às 15:50, em 783,4 segundos. Não houve novas recusas HTTP 403/429. O registo de espera anterior (403 de 4 de novembro, expirado às 15:15 de 5 de novembro) não foi renovado.

- 379 páginas analisadas, zero pendentes.
- 15 provas verificadas e atualizadas; zero criações, fusões ou quarentena.
- 60 páginas de provas passadas, 265 de outras modalidades e 35 fora dos anos abrangidos.
- Quatro páginas com cabeçalho/modalidade/data não interpretados: `desafio-acdl-2027`, `granfondo-sra-da-gra-a`, `meia-maratona-de-guimar-es`, `taca-regional-de-xcm-trofeu-meias-maratonas-arcvr-2026`.

O resultado correto é parcial por estes erros de leitura, não por um bloqueio de acesso. O painel conserva cobertura, etapa ativa mesmo com avisos e duração acumulada entre blocos. Não se efetuou uma segunda recolha para verificar a interface.
