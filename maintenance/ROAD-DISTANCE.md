# Distância por estrada sem serviço pago

O detalhe de uma prova inclui um link de percurso Google Maps, que não usa uma API faturada nem requer chave. Os cartões e o filtro identificam explicitamente a distância em linha reta.

Para calcular quilómetros dentro do site, criar uma conta **Standard gratuita** em https://account.heigit.org/ e configurar `ORS_API_KEY` como variável privada no ambiente Vercel. Fazer novo deployment após a configuração. Nunca usar `NEXT_PUBLIC_` para esta chave nem guardá-la no Git. Sem chave, o botão de cálculo fica oculto e a API devolve `NOT_CONFIGURED`.

O cálculo é manual, no detalhe, usando Directions/driving-car do OpenRouteService. Não há pedidos externos de routing ao abrir o calendário, navegar ou filtrar. O destino são as coordenadas existentes da prova; não se garante que correspondam ao ponto exato da partida. O filtro continua a ser em linha reta mesmo quando existe uma distância rodoviária calculada para alguns cartões.

O navegador guarda até 100 pares origem/destino durante 7 dias. A chave muda se a origem ou destino mudar. O servidor mantém até 200 resultados em memória por 24 horas e agrega pedidos simultâneos idênticos. Não há leituras/escritas de BD para routing nem cálculo de todos os eventos.

Proteções locais por worker: 30 pedidos/minuto e 1.800/dia; não são um contador global entre instâncias Vercel. O limite global continua a ser a quota do plano gratuito do fornecedor (Directions: 2.000/dia, 40/minuto na consulta de 24/09/2026). Não há retries automáticos, substituição por serviço pago ou ativação de faturação. Erros/quota esgotada deixam disponível o link Google Maps e nunca são apresentados como distância rodoviária.

O uso de CPU/rede do alojamento continua sujeito às condições do plano Vercel existente. Não é criado qualquer novo serviço pago.

Verificação: `node --test tests/road-distance.test.mjs` cobre sucesso, quota esgotada, limites, validação, cache e integração desativada. A interface foi testada com um fornecedor simulado, incluindo resultado no detalhe/cartões e persistência após recarregamento. Para validar o fornecedor real será necessária a chave gratuita e uma consulta de teste com coordenadas públicas.
