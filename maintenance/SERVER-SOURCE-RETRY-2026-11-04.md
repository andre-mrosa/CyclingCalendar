# Retoma automática de Stop and Go no servidor

Após HTTP 429, o workflow principal agenda um worker durável para `retryAt + 60 segundos` e continua as restantes fontes. O worker usa `workflow.sleep(Date)`, libertando o servidor durante a espera. Não depende do navegador, do computador do utilizador nem de automações do Codex.

Uma única linha operacional `operational-stopandgo-retry` guarda a propriedade por token, o workflow, o instante agendado e o número de tentativas. A criação/CAS da linha e a verificação do workflow existente evitam duplicações; um worker antigo perde autorização quando o seu token é substituído. Respostas ambíguas de agendamento têm um período de recuperação de cinco minutos. Todas as linhas com prefixo `operational-` ficam fora da pesquisa/contagens/limpeza dos logs.

Na hora prevista, o servidor volta a ler o prazo da fonte. Se este mudou, espera pelo novo prazo + um minuto. Se houver uma sincronização em curso, aguarda em vez de concorrer com ela. A retoma consulta apenas Stop and Go e finaliza a atualização do calendário; as outras fontes não são recolhidas de novo. O painel mostra a retoma pendente/em curso e só apresenta a fonte efetivamente consultada no respetivo resumo.

Até três tentativas automáticas podem ser feitas por worker. Novo HTTP 429 volta a agendar o mesmo worker; recusas de autenticação 401/403 não entram neste ciclo. Após três recusas, a pendência permanece visível; uma sincronização posterior pode voltar a avaliar a fonte. Se outra recolha terminar entretanto com acesso normal à fonte, o antigo período de espera é resolvido e a retoma desnecessária é cancelada.

`GET /api/admin/scraper-retry` é uma consulta privada do estado. `POST` exige administrador e JSON da mesma origem para agendar um período de espera anterior à publicação ou recuperar um agendamento que falhou. Não aceita datas, tokens ou destinos fornecidos pelo cliente: lê o período confirmado no servidor. As futuras recusas são agendadas automaticamente pelo workflow, sem necessidade desse botão.

Validação: testes de atraso exato de 60 segundos, worker único, conflito de sincronização, respostas ambíguas, perda de propriedade, novo prazo da fonte, cancelamento de tentativas obsoletas, limite de tentativas, execução apenas da fonte, continuação dos restantes scrapers e autorização/origem do endpoint. A automação pontual anteriormente criada no Codex foi eliminada; o agendamento passa a pertencer ao site.
