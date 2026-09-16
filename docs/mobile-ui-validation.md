# Validação adicional da interface mobile

Concluída em 16/09/2026, após a versão estável `0128d3e`, usando o servidor local com compilação de produção.

## Correções

- Controlos táteis maiores (mínimo de 44 px nos controlos ajustados), campos com texto de 16 px e filtros mais compactos em ecrãs pequenos.
- Botão de limpar filtros disponível quando apenas o ano, âmbito ou licença são alterados.
- Página de favoritos deixa de depender do carregamento do Clerk para apresentar os favoritos locais offline.
- Navegação sem pré-carregamento nos links ajustados, após erros intermitentes de pedidos de navegação em WebKit durante mudanças de sessão.
- Quatro traduções em falta adicionadas nos quatro idiomas e 18 textos com caracteres corrompidos corrigidos. Testes novos verificam as chaves literais usadas na interface e caracteres inválidos.

## Resultados

| Verificação | Resultado |
| --- | --- |
| Testes automáticos | 124 aprovados |
| ESLint | Sem erros ou avisos |
| Compilação de produção | Concluída com sucesso |
| Interações mobile, quatro dimensões | 24 aprovadas |
| Conta, permissões e administração, dois navegadores mobile | 34 aprovadas |
| Entrada por email/código, cabeçalho a 320 px e saída pela interface | 6 aprovadas |
| Favoritos offline, remoção, recarregamento e reconexão | 4 aprovadas |

Perfis: WebKit com emulação iPhone a 375×667, 320×568 e 667×375; Chromium com emulação Android a 360×740. Foram exercitados toques, filtros, reposição do ano, favoritos, menus, detalhe de prova, idioma e tema. Foram também revistas capturas da interface.

A matriz autenticada verificou favoritos persistentes, criação e revogação do endereço privado ICS, acesso às cinco secções de administração, pesquisa de utilizadores, limpeza de favoritos de teste, eliminação de uma conta temporária pela interface, pesquisa/exportação de logs, revogação do próprio acesso admin e isolamento após logout. As APIs administrativas devolveram 401 para visitante, 403 para utilizador comum e 200 para admin nos pedidos verificados.

O teste adicional de login preencheu o formulário de email e o código de verificação na interface Clerk, em ambos os navegadores. Usou emails reservados `+clerk_test` e o código da instância de desenvolvimento, conforme a [documentação Clerk](https://clerk.com/docs/guides/development/testing/test-emails-and-phones). As contas temporárias foram eliminadas.

Os 34 testes de conta/admin correram antes da última correção exclusivamente de traduções. Os testes de interação, login e offline foram repetidos na compilação final.

## Limites e evidência

- Emulação em navegador; não houve testes em telemóveis físicos.
- Esta ronda concentra-se em mobile. A validação anterior de PC/web está em [qa-validation.md](qa-validation.md).
- Não foram efetuadas novas autorizações Google OAuth nem escritas reais no Google Calendar.
- Os estados de sincronização foram simulados no teste da interface. Não foi executada sincronização global nem eliminação global de logs.
- Capturas e resultados locais estão em `.qa-tools/mobile-polish/`; logs em `qa-mobile-*.log`. Estes artefactos de execução estão ignorados pelo Git.
- A validação foi concluída localmente antes do commit e push destas correções.
