# Restaurar Auto-Tema (Light/Dark) e Auto-Idioma

A pedido do utilizador, vamos restaurar as funcionalidades de suporte ao **Light Mode / Dark Mode automático** (baseado no sistema) e **Múltiplos Idiomas automático** (baseado no idioma do browser). Não serão adicionados botões/toggles na interface para mudar manualmente, mantendo-se 100% automático.

## User Review Required

> [!WARNING]
> Restaurar estas funcionalidades exigirá reescrever centenas de linhas de código em vários componentes, visto que a versão atual 0.11.3 "chumbou" as cores escuras e os textos em Português diretamente no código. Aprovas que se faça esta alteração profunda?

## Open Questions

> [!IMPORTANT]
> Nas novas páginas de Política de Privacidade e Termos de Serviço, também devo traduzir o texto todo para Inglês, Espanhol e Francês, ou mantemos essas páginas jurídicas apenas em Português? 

## Proposed Changes

### Core & Layout
#### [MODIFY] [layout.js](file:///c:/Mine/CyclingCalendar/CyclingCalendar-app/app/layout.js)
- Alterar o `ThemeProvider` para `defaultTheme="system"` e `enableSystem={true}`.
- Remover o atributo estático `className="dark"` da tag `<html>`.
- Garantir que o body tem as cores de base para light e dark (`bg-white dark:bg-slate-950`).

### Páginas e Componentes Principais
#### [MODIFY] [page.js](file:///c:/Mine/CyclingCalendar/CyclingCalendar-app/app/page.js)
- Substituir o texto hardcoded por chamadas ao sistema de tradução `useTranslation()`.
- Introduzir prefixos `dark:` nos estilos Tailwind (ex: de `bg-slate-900` para `bg-slate-50 dark:bg-slate-900`).

#### [MODIFY] Componentes (ex: EventModal, EventDetailClient)
- Aplicar o hook `useTranslation()`.
- Restaurar estilos compatíveis com Light Mode (`bg-white dark:bg-slate-950`, `text-slate-900 dark:text-slate-200`, etc).

#### [MODIFY] [privacy-policy/page.js](file:///c:/Mine/CyclingCalendar/CyclingCalendar-app/app/privacy-policy/page.js) & [terms-of-service/page.js](file:///c:/Mine/CyclingCalendar/CyclingCalendar-app/app/terms-of-service/page.js)
- Adaptar as classes Tailwind (que fiz há pouco apenas para dark mode) para suportarem um fundo branco/claro no Light Mode.

## Verification Plan

### Manual Verification
- O utilizador deverá testar alterar o idioma do seu browser para Inglês e verificar se a interface traduz automaticamente.
- O utilizador deverá alterar o esquema de cores do seu SO (Windows/macOS) para "Claro/Light" e confirmar se a aplicação atualiza o tema automaticamente.
