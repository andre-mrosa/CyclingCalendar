# Interface aprovada — setembro de 2026

> Registo da direção anterior, entretanto substituída pelo mockup simples aprovado a 16 de setembro. A implementação e verificação atuais estão em [ui-simplification.md](ui-simplification.md). Os resultados abaixo referem-se à versão anterior.

## Direção visual

Implementação da composição aprovada no mockup, com a correção posterior de cor: fundo branco no modo claro, fundo escuro neutro no modo noturno e azul discreto para ações e seleção. Favoritos e avisos mantêm cores semânticas. Foi mantido o logótipo existente antes do mockup; o símbolo do mockup não foi adotado.

- Navegação principal: Explorar, Minha Agenda e Favoritos; restantes categorias no menu Provas.
- Pesquisa e modalidades no topo. Filtros adicionais preservam anos, meses, região, distrito, escalões e critérios existentes.
- Lista agrupada por data, com separadores finos. Intervalos de vários dias continuam explícitos; datas não confirmadas não recebem um dia fictício.
- Títulos inteiramente em maiúsculas recebem uma apresentação mais legível na lista, preservando siglas e dados originais.
- Calendário lateral com indicadores das provas reais, seleção de dia e navegação entre meses. Vista mensal alternativa.
- Navegação inferior mobile respeita as abas visíveis nas preferências. Menu, favoritos e conta continuam acessíveis.
- Fotografia decorativa gerada para o cabeçalho desktop (`public/cycling-editorial.png`); não representa uma prova específica e fica oculta em mobile.
- Tratamento partilhado de cores e componentes nos detalhes, definições, favoritos, autenticação e administração.

Os identificadores das paletas foram preservados para manter preferências existentes. A paleta principal chama-se Azul. Não foram adicionados scrapers nesta ronda.

## Verificação

Build de produção concluído, ESLint sem avisos e **129 testes automáticos aprovados**, incluindo contraste, traduções, agrupamento de datas, intervalos entre meses e apresentação de títulos.

| Percurso em navegador | Resultado |
| --- | --- |
| Calendário, modalidades, navegação mensal, seleção de dia e pesquisa: PC e iPhone | 12/12 |
| Toques, filtros, favoritos, menus, detalhe, idioma e tema: quatro dimensões mobile | 24/24 |
| Visitante, conta comum e admin: PC Chromium, Android Chromium e iPhone WebKit | 51/51 |
| Login por email/código na interface Clerk, cabeçalho a 320 px e logout | 6/6 |
| Favoritos offline, remoção, recarregamento e reconexão | 4/4 |

Dimensões principais: PC 1440×1000; mobile 375×667, 360×740, 320×568 e horizontal 667×375. Capturas adicionais a 375×812 nos temas claro e escuro.

A matriz autenticada verificou restrições 401/403 para visitante/utilizador comum, acesso admin, persistência de favoritos, criação e revogação de endereço ICS privado, cinco secções administrativas, pesquisa/exportação de logs e operações sobre contas temporárias. As contas criadas foram eliminadas no fim.

Os testes de contas antecederam os últimos ajustes de apresentação dos títulos, navegação e cores. Os percursos de calendário, interação mobile e offline foram repetidos após os ajustes estruturais. O último ajuste de cores dos controlos ativos teve nova compilação e inspeção visual.

Os seletores dos testes foram adaptados para distinguir o novo grupo de modalidades dos seletores de filtros; as verificações de comportamento foram preservadas.

## Limites e artefactos

- Mobile emulado em Chromium/WebKit; não foram usados telemóveis físicos.
- Login na instância Clerk de testes, com email reservado e código de desenvolvimento; não valida entrega de email real ou Google OAuth.
- Não foram efetuadas escritas reais no Google Calendar, sincronização global de fontes nem eliminação global de logs. Os estados da interface de sincronização foram testados com respostas isoladas.
- Houve avisos Clerk sobre renovação de sessão durante a matriz de autenticação. Os percursos de login, autorização e logout completaram-se; não se afirma ausência de avisos de rede do fornecedor.
- Capturas e resultados: `.qa-tools/approved-ui/`. Login e offline: `.qa-tools/mobile-polish/`. Logs: `qa-approved-*.log`.
- As alterações ficam locais para revisão; não houve commit, push ou publicação nesta ronda.
