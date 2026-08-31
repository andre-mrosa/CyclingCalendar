This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Sincronização dos calendários

O `vercel.json` agenda `/api/cron/scrape` diariamente às 02:00 UTC. A recolha
consulta janeiro–dezembro do ano atual e do seguinte; aos domingos e no primeiro
dia do mês inclui também os dois anos anteriores. Não depende de abrir o site
nem do botão de sincronização manual. O calendário futuro pode ainda estar vazio.

A FPC exige o campo oculto `epoca_site2` para aplicar os meses enviados. A resposta
é validada para impedir que o mês corrente seja aceite como uma época completa.
Campeonatos nacionais exigem confirmação FPC no nome ou na classe da prova;
referências em descrições não contam. A Stop and Go usa a modalidade e as datas
do cabeçalho da própria prova, com pedidos espaçados e erro explícito em HTTP 429.

Testes: `npm test` (ou `node --test tests/calendar-scrapers.test.mjs`).

Para auditar dados antigos, executar
`node --env-file=.env --env-file=.env.local maintenance/repair-calendar.mjs`.
O script não altera a BD e guarda um plano em `maintenance/backups/`. Aplicar
o plano revisto com o mesmo comando e `--apply-plan=CAMINHO_DO_PLANO`.
Antes de alterar eventos é guardada uma cópia dos registos e traduções. Eventos
não ciclísticos confirmados passam para a fonte `Quarentena`, preservando IDs
e dados para recuperação. Falhas HTTP e dados ambíguos ficam sem alteração.
Os ficheiros de recuperação são locais e estão excluídos do Git.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.js`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

2026
