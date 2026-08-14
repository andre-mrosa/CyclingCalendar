# Tarefas de Implementação: Abas no Modal de Eventos

## 1. Backend & Schema
- `[x]` Adicionar `insurance` e `prizes` ao `schema.prisma`.
- `[x]` Correr `npx prisma db push` para atualizar a base de dados na Supabase.

## 2. Trabalhador Noturno (Scraper)
- `[x]` Modificar `app/api/cron/scrape/route.js`.
- `[x]` Adicionar lógica extra no `deepScrapeCabreira` para capturar Preços, Seguros, e Prémios.
- `[x]` Salvar esses dados nos novos campos do Prisma.

## 3. Frontend (UI)
- `[x]` Atualizar `app/components/EventModal.js`.
- `[x]` Adicionar estado para gerir as Abas (`activeTab`).
- `[x]` Desenhar os botões de Aba (com ícones).
- `[x]` Implementar o conteúdo dinâmico para cada Aba:
  - `[x]` Info do Evento
  - `[x]` Inscrição & Preços
  - `[x]` Programa (carregado dinamicamente quando a aba é selecionada)
  - `[x]` Prémios & Seguro
  - `[x]` Localização
- `[x]` Garantir que o design mantém a sensação "Premium" com transições e bom contraste.

## 4. Testes
- `[ ]` Testar o cron job para garantir que extrai a nova informação.
- `[ ]` Abrir o modal na UI e verificar a navegação por abas.
