# Interface aprovada — 3 de novembro de 2026

Aplicação da proposta interativa revista pelo responsável do projeto: fundos neutros, verde original nos destaques, fundo preto puro no tema escuro e ações principais consistentes entre descoberta, coleção pessoal e ficha da prova.

## Comportamento

- Pesquisa por nome e por localidade, com sugestões pesquisáveis e tolerância a pontuação/acentos. O filtro exato por localização publicada continua nos filtros avançados. A apresentação não corrige municípios nem inventa coordenadas.
- Atalhos de modalidade, fim de semana e mês visíveis. Escalões, elegibilidade, fontes selecionadas, anos, licença, âmbito, classificação regional, pesquisas guardadas e avisos são preservados.
- Navegação mensal comum a Lista e Calendário. A seleção de um dia mantém a grelha e apresenta as provas abaixo. Registos sem data continuam disponíveis, sem serem colocados num dia inventado.
- As minhas provas abre nas próximas provas, mostra a próxima prova guardada e separa a coleção completa do subconjunto Google Calendar. Estados de participação e período são filtros independentes. O histórico continua acessível.
- A ficha mantém os dados públicos reais, a origem e os avisos de elegibilidade; inclui guardar/gerir participação, Google Calendar e acesso ao organizador. Não publica descrições, preços ou distâncias fictícios do protótipo. Sugestões relacionadas são futuras, com exclusão de aliases e duplicados.
- O regresso da ficha usa uma rota de calendário validada, preservando a pesquisa mais recente. URLs externas e rotas administrativas não são aceites neste atalho.
- Formato distingue Por etapas, Um dia e Vários dias. Vários dias exige um intervalo confirmado e não implica etapas. As regras existentes de classificação mantêm-se.
- Adicionar ao Google Calendar também guarda o estado Interessado, quando a operação é confirmada pela API. Remover só do Google mantém a prova guardada. Remover da coleção pede confirmação explícita e, se aplicável, remove também do Google; uma falha do Google impede a remoção pessoal. Não existe promessa de desfazer uma eliminação externa.
- Um registo ainda presente no Google faz parte da coleção, mesmo que a interface antiga o tivesse ocultado apenas na aplicação. Esta compatibilidade é calculada na leitura, sem reescrever estados ou eventos externos.

## Verificação

Testes cobrem pesquisa e persistência do novo filtro, limites mensais e datas desconhecidas, distinção de formatos, sugestões relacionadas, regresso seguro e ordem/cancelamento/falha da remoção pessoal. Mantêm-se os testes do endpoint de remoção, autenticação, origem e correspondência dos identificadores Google.

Revisão local com dados públicos reais em computador e vista de 390 px: ausência de transbordo horizontal, mesma posição do seletor nas duas vistas, ficha traduzida, guardar como visitante e coleção pessoal. A conta de produção e os eventos reais do Google não foram alterados durante estes testes.

Sem migrações de base de dados. As rotas de compatibilidade, metadados, URLs canónicas e dados estruturados das provas são preservados. A paleta Forest continua a usar o verde original, com superfícies neutras; outras escolhas explícitas de paleta permanecem disponíveis.
