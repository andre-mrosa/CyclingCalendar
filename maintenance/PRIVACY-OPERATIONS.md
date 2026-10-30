# Registo operacional de proteção de dados

Data de referência: 30/10/2026. Responsável identificado publicamente: André Rosa. Canal: formulário `/contacto`. Documento interno baseado no funcionamento inspecionado, a rever quando mudarem funcionalidades, fornecedores ou finalidades. Não contém registos individuais de utilizadores.

## Atividades e critérios de conservação

| Atividade | Dados/finalidade | Fundamento adotado no modelo | Destinatários | Conservação e controlos |
| --- | --- | --- | --- | --- |
| Conta/autenticação | Identificador, nome, email, imagem e dados de autenticação geridos pelo fornecedor; acesso/sincronização. | Prestação das funcionalidades da conta; obrigações legais quando aplicáveis. | Clerk; infraestrutura Vercel; Neon para dados locais associados. | Enquanto necessários à conta e aos pedidos. Controlos de eliminação e webhook assinado. Não guardar tokens no relatório. |
| Favoritos e novas edições | IDs de provas, exclusões, preferências e estados de correspondência. | Prestação da função pedida; escolha facultativa de seguir edições. | Clerk/Neon/Vercel. | Necessários à sincronização/gestão da preferência; eliminação com dados da conta. Desligar o seguimento conserva edições já guardadas. |
| Avisos por email | Email principal verificado, idioma, avisos e estado de deduplicação/pendentes. | Consentimento para avisos opcionais. | Resend e fornecedor de email destinatário; Clerk/Neon/Vercel. | Desativação em Guardadas cancela pendentes da aplicação; estado necessário pode persistir até eliminação da conta. Cópias já entregues têm gestão própria. |
| Push | Subscrição por dispositivo, endpoint/chaves, hora/fuso/idioma e estado de deduplicação. | Ativação facultativa e permissão de notificações. | Fornecedor push do navegador; Neon/Vercel. | Remoção ao desativar na aplicação, apagar conta ou receber expiração do fornecedor. Revogar só a permissão no OS pode não notificar imediatamente a aplicação. |
| Google Calendar | Lista de calendários, dados necessários aos eventos e conflitos, permissões OAuth via Clerk. | Integração solicitada pelo utilizador. | Google, Clerk e Vercel; estado local no navegador. | Revogação de permissões no Google; eventos já exportados não são apagados pela simples eliminação da conta do site. Consulta principal antiga descrita na política. |
| Subscrição ICS | Token privado e favoritos incluídos. | Função pedida pelo utilizador. | Clerk/Vercel/Neon e aplicação de calendário escolhida. | Até revogação/eliminação da conta; quem tem a ligação consegue consultar. Não colocar a ligação num pedido público. |
| Assistente de região | Pesquisa de localidade ou coordenadas aproximadas, apenas a pedido. | Escolha facultativa após informação e permissão GPS quando aplicável. | Vercel e Nominatim/OSMF; IP do servidor para o fornecedor. | Sem gravação de pesquisas/coordenadas na BD. Respostas regionais em memória até uma hora, chaves hash e sem associação à conta. Preferência final no navegador; alternativa manual. |
| Assistente de escalão | Ano, género e escolhas introduzidas para calcular uma sugestão. | Função pedida. | Processamento no navegador. | Estado local do componente; guardar uma preferência de escalão não é guardar os dados de nascimento na conta. Confirmar regulamento da prova. |
| Estatísticas opcionais | Contadores agregados por dia/página/ação e ID público da prova. | Consentimento retirável, sem limitar acesso ao calendário. | Neon/Vercel. | Janela de treze meses; limpeza por recolha de estatísticas. Cookie de escolha com cento e oitenta dias. Não recolhe novos identificadores individuais, pesquisas, conta, IP ou localização nas tabelas de estatísticas. |
| Contacto e direitos | Mensagem, nome/email opcionais; email de resposta necessário para dar seguimento individual. | Interesse legítimo de responder a contactos; obrigações legais para direitos. | Vercel/Resend e caixa de correio do responsável. | Apenas enquanto necessário para resposta e seguimento. Rever mensagens concluídas e eventuais necessidades legais. Não afirmar apagamento automático de cópias externas. |
| Segurança/diagnóstico | Registos técnicos necessários; eventualmente identificadores em falhas/pedidos antigos. | Interesse legítimo de proteger/diagnosticar o serviço. | Vercel/Neon e fornecedores técnicos necessários. | Limpeza pontual de logs com mais de trinta dias autorizada em 30/10/2026. Rever necessidade e evitar dados pessoais em mensagens de erro. A limpeza não criou novo agendamento recorrente. |

As estatísticas individuais das versões anteriores foram removidas do conjunto local identificado em 30/10/2026, após autorização. As contagens agregadas atuais foram preservadas. Isto não equivale a apagar backups dos fornecedores ou cópias externas.

## Pedidos de direitos

1. Registar data, canal, pedido, estado e prazo, evitando copiar a mensagem para logs de diagnóstico.
2. Confirmar a identidade de modo proporcional quando necessário. Não pedir documentos de identificação por defeito se uma sessão ou confirmação de email for suficiente.
3. Identificar os dados na aplicação e nos fornecedores, incluindo mensagens na caixa de correio, pendentes e subscrições. Distinguir apagar dados da conta de apagar a conta de autenticação.
4. Responder em regra no prazo de um mês. Se for necessária e legalmente admissível uma prorrogação, informar no primeiro mês com a justificação. Registar cumprimento/limitações; não declarar apagadas cópias que não tenham sido abrangidas.
5. Não apagar automaticamente eventos pessoais Google, mensagens já entregues ou dados noutros dispositivos sem verificar o pedido e a capacidade de agir sobre esses destinos.

Referências: [CNPD — direitos](https://www.cnpd.pt/cidadaos/direitos/) e [RGPD, artigos 12–22](https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32016R0679).

## Incidentes

- Conter o incidente, preservar os registos estritamente necessários e documentar quando se tomou conhecimento, dados afetados, pessoas potencialmente afetadas e medidas tomadas. Não divulgar tokens/dados de utilizadores em issues públicas.
- Avaliar o risco para as pessoas. A notificação à CNPD não é automática para toda a falha: verificar os critérios do artigo 33, incluindo o prazo de setenta e duas horas após conhecimento quando aplicável, e justificar atrasos.
- Avaliar comunicação às pessoas afetadas quando houver elevado risco, nos termos do artigo 34. Documentar também a decisão fundamentada de não notificar.
- Coordenar com os fornecedores e confirmar cumprimento dos pedidos de contenção/eliminação. A notificação do fornecedor ao responsável não substitui a avaliação deste.

Referências: [CNPD — obrigações e formulários](https://www.cnpd.pt/organizacoes/outras-obrigacoes/), [RGPD, artigos 33–34](https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32016R0679).

## Verificação periódica do responsável

Os avisos de pesquisa são opcionais e exigem consentimento explícito e email principal verificado. Guardam filtros públicos, IDs de resultados já avisados e o envio pendente necessário para evitar duplicados; não guardam localização GPS nem filtros de favoritos/agenda. Podem ser pausados ou eliminados em `/avisos` e são abrangidos pela eliminação da atividade da conta. Não ativar avisos em nome de utilizadores durante testes.

As submissões de organizadores guardam os factos propostos, contacto da conta e revisão privada. Email verificado não comprova representação: a publicação exige revisão humana. Pendentes/rejeitadas expiram em 90 dias; nas aprovadas, contacto, identificação do representante e notas são anonimizados após 90 dias. Os factos públicos da prova podem permanecer. As métricas de qualidade por fonte expiram em 90 dias, e os marcadores diários de início dos avisos em 30 dias. A limpeza corre na finalização das sincronizações.

Manter os dados da entidade/canal de contacto corretos; proteger as contas administrativas e a caixa de correio; guardar as versões contratuais aplicáveis e rever subcontratantes/transferências; tratar pedidos e rever necessidade de conservação; reavaliar o modelo antes de publicidade, patrocínios, cobrança ou novas integrações. Este documento organiza essas operações e não comprova que todas as configurações privadas foram auditadas.
