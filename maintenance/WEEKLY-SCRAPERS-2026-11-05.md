# Frequência semanal das fontes

Por pedido do proprietário, as cinco fontes principais passam de diário a semanal: quarta-feira às 01:00 UTC (`0 1 * * 3`), equivalente a 01:00 no inverno e 02:00 no verão em Portugal continental. A amostra disponível contém 55 visualizações agregadas por dia da semana em 60 dias, com apenas uma à quarta-feira; não há sessões recentes com detalhe horário. O dia tem suporte numa amostra pequena e a escolha da madrugada é operacional, não uma medição de tráfego horário mínimo.

O plano weekly anteriormente só consultava a FPC; passa a incluir FPC, Cabreira, Stop and Go, Recorde Pessoal e Apedalar, o ano atual e o seguinte. O cron diário foi removido. MQ Series e Bairrada mantêm a recolha mensal no dia 1 às 05:00 UTC. Emails e push mantêm a sua periodicidade, pois não são recolhas às fontes.

As continuações da mesma recolha e a retoma limitada após HTTP 429 continuam a respeitar o período de espera e o minuto adicional já pedido. Não se consulta uma fonte durante o bloqueio. Uma execução semanal não garante que a origem deixe de recusar acesso.

O painel passa a permitir «Executar apenas Stop and Go», com a mesma autenticação administrativa, reserva e workflow persistente das restantes recolhas. Não inicia as outras fontes. Esta opção é usada para a verificação manual autorizada em 5 de novembro, após o termo da espera registada às 15:15.
