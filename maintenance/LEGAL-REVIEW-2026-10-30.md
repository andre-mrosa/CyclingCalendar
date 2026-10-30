# Revisão dos textos legais — 30 de outubro de 2026

## Âmbito

Revisão técnica/editorial dos Termos de Serviço, Política de Privacidade e aviso do assistente de região, com correspondência ao código e traduções PT/EN/ES/FR. Não constitui certificação jurídica do projeto nem auditoria aos contratos/configurações privadas dos fornecedores.

## Constatações e alterações

- O assistente de região faz pedidos diretos a `nominatim.openstreetmap.org`: pesquisas de localidades e, se pedido e autorizado, coordenadas GPS. O fornecedor também recebe o IP. Acrescentado na política e antes dos controlos do assistente, com ligação à política OpenStreetMap e alternativa manual nas definições. Não foram pedidos GPS nem enviadas pesquisas reais nesta revisão.
- A subscrição ICS de favoritos usa um código privado na ligação. A política passa a explicar que a ligação permite consultar o calendário sem login, que um fornecedor de calendário a recebe quando o utilizador a adiciona e que a revogação não apaga cópias anteriores.
- Google Calendar: descritas a leitura da lista de calendários/eventos, a criação do calendário dedicado, a adição/remoção de entradas do serviço e a possibilidade de consulta do calendário principal quando não é encontrado o dedicado. Revogar permissões no Google não apaga por si só eventos já exportados.
- Separadas a prestação das funções pedidas, o consentimento para funções opcionais, o interesse legítimo de segurança/resposta a contactos e as obrigações legais de resposta a pedidos de direitos. Aceitar os termos não equivale a consentir em emails, push, localização ou estatísticas.
- Corrigida a referência a prazos de cache inexistentes. O armazenamento local do calendário/preferências não tem expiração automática geral; os dados podem ser removidos nas definições de dados do navegador. A escolha de estatísticas tem prazo próprio no cookie e as contagens agregadas têm política própria de conservação.
- Explicados os estados necessários à sincronização/deduplicação, mensagens pendentes de email, encaminhamento do formulário para a caixa de correio do responsável e o registo técnico de pedidos de eliminação. Não se promete eliminação automática de cópias externas, de outros dispositivos ou de dados já exportados.
- Fornecedores atualizados e ligados aos seus documentos. A informação pública da Resend refere armazenamento de conteúdo de mensagens e registos de entrega nos EUA; a política deixa isso explícito. Não se afirma que todo o tratamento ocorre no EEE.
- Termos passam a cobrir classificações automáticas, sugestões de escalão, favoritos e notificações, sem equiparar favoritos a inscrições nem garantir entrega/hora de avisos. As limitações de responsabilidade ficam expressamente sujeitas aos direitos e responsabilidades que não possam ser afastados por lei.
- Atualizadas as datas das duas páginas para 30/10/2026, nas quatro línguas.

## Verificações

Verificados os fluxos de consentimento de estatísticas, envio de email, subscrição/revogação ICS, push, eliminação de atividade e Google Calendar em código. Traduções dos textos efetivamente usados nas páginas são verificadas por teste, incluindo datas e números. As páginas e o aviso foram inspecionados no browser a 375 px; não houve overflow nem erros no console nas verificações efetuadas.

## Pontos operacionais que não se resolvem com texto

- Prazos de resposta a direitos, revisão de mensagens guardadas na caixa de correio e avaliação da necessidade de conservar registos dependem da atuação do responsável. Não se acrescentaram prazos fixos ou automatismos inexistentes.
- As regiões de processamento, os contratos de tratamento, as garantias concretas das transferências e a cadeia de subcontratantes devem ser confirmados nas contas/documentos aplicáveis a Vercel, Clerk, Neon/Databricks, Resend e ao fornecedor de correio. A consulta de documentos públicos não comprova as configurações ou acordos particulares deste projeto.
- A API pública Nominatim tem regras próprias de capacidade e utilização, incluindo limite global por aplicação. Esta revisão acrescenta transparência no pedido; não certifica a capacidade do serviço perante crescimento de tráfego.

## Fontes primárias consultadas

- [RGPD — artigos 6, 12 e 13](https://eur-lex.europa.eu/legal-content/PT/TXT/?uri=CELEX:32016R0679).
- [CNPD — consentimento](https://www.cnpd.pt/organizacoes/areas-tematicas/consentimento/) e [exercício de direitos](https://www.cnpd.pt/cidadaos/direitos/).
- [OpenStreetMap — privacidade](https://osmfoundation.org/wiki/Privacy_Policy) e [utilização de Nominatim](https://operations.osmfoundation.org/policies/nominatim/).
- [Resend — dados e transferências](https://resend.com/security/gdpr).
- [Clerk — acordo de tratamento](https://clerk.com/legal/dpa), [Vercel — privacidade](https://vercel.com/legal/privacy-notice), [Neon/Databricks — privacidade](https://www.databricks.com/legal/privacynotice), [Google — privacidade](https://policies.google.com/privacy).
