# Recolha mensal dos organizadores

Implementação de 5 de novembro de 2026. Fontes: Mountain Quest, MQ Series, regulamentos Iron Rider Salvador/Castelo, regulamento Terra Norte; página e regulamento Bairrada 150. Apenas factos e links públicos, sem participantes, imagens, programas completos ou resultados.

## Funcionamento

- Novo âmbito `organizers`, separado de daily/weekly/manual: MQ Series, Bairrada e finalização.
- Vercel cron no dia 1 às 05:00 UTC. Primeira execução iniciada no painel após publicação.
- Cada organização reserva o mês na SystemLog antes de fazer pedidos. Reentrada no mesmo mês não contacta as fontes. A próxima data é o primeiro dia do mês seguinte às 05:00 UTC.
- Os pedidos são sequenciais, com intervalo mínimo de dois segundos por domínio; oito páginas configuradas. Sem seguir redirecionamentos ou links arbitrários.
- Recusas 401/403/429 persistem uma barreira por domínio; respeita Retry-After e não faz tentativas imediatas. Falhas mantêm a próxima verificação mensal e aparecem no painel. Não há consultas ao Stop & Go neste âmbito.
- `/api/admin/organizers`: leitura autenticada e arranque por POST JSON com validação de origem. O botão consulta apenas organizações devidas; não contorna intervalo nem bloqueios.

## Precisão das datas

- Campo JSON opcional `Event.temporalEvidence`: série e, por campo, precisão, valor e URL de origem. A migração é aditiva.
- Prova só com mês: rótulo `— OUT 2027`; sortDate no início do mês apenas para ordenação. O parser de datas exatas recusa este rótulo. Lista, grelha, detalhe, filtros, páginas mensais e offline preservam o mês e não inventam dia. Continua futura até terminar o mês.
- Abertura só com mês: dia 1 como lembrete de dia inteiro, título «Abertura prevista de inscrições», com explicação. O estado não passa a «aberto» só por atingir essa data.
- Google e ICS usam o lembrete mensal; a prova sem dia exato não é exportada como prova no dia 1. Ao voltar a adicionar uma abertura entretanto confirmada, o Google atualiza o lembrete estimado existente sem criar outro.
- A subscrição ICS conserva os UIDs quando as datas passam a exatas. A exportação individual para Google não sincroniza silenciosamente todas as entradas existentes: a atualização ocorre ao adicionar novamente esse lembrete.

## Integridade e edições

- IDs estáveis por série/ano/ronda; nomes alternativos da Bairrada reconhecidos no seguimento anual.
- Fusão procura primeiro a identidade da série e ano e conserva o ID existente. Uma confirmação exata pode refinar o mês; um anúncio mensal posterior não apaga uma data exata.
- Datas exatas contraditórias entre fontes geram erro para revisão; ausência de um campo não apaga um valor anterior.
- JSON-LD de 2026 não substitui a edição atual de MQ; inscrições são lidas da configuração e dos textos PT usados pela página atual. Código não é executado.
- Regulamentos de outro ano não fornecem inscrições para a edição atual. Bairrada pode publicar um mês novo e manter regulamento antigo: o anúncio entra com aviso, sem copiar as inscrições antigas.
- Mutante é extensão da MQ; Iron Inferno é duatlo em desenvolvimento. Não se criam eventos independentes a partir destes blocos.

## Validação

Simulação em páginas reais: MQ 19 JUN 2027, abertura prevista ABR 2027; Salvador FEV 2027; Castelo SET 2027; Terra Norte OUT 2027; Bairrada reconhecida como 2026 e excluída da recolha de provas atuais em novembro.

Testes cobrem parsers, regulamentos antigos, inscrições entre anos, fases/pagamento, precisão na apresentação e offline, exportação Google/ICS, atualização do lembrete, fusão com FPC preservando ID, conflitos, autenticação/origem e reentrada mensal/bloqueios. Nenhum teste envia email ou altera calendários reais.

Limites: o intervalo mensal pode atrasar a descoberta até um mês; os sites podem alterar a estrutura e exigir adaptação. Anúncios só por Instagram continuam dependentes de confirmação/manual até aparecerem nas páginas acompanhadas.
