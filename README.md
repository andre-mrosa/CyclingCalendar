# Cycling Calendar

Calendário de provas de ciclismo em Portugal, com pesquisa, uma área «As minhas provas», estados de participação e seguimento de novas edições. Aplicação Next.js, PostgreSQL/Prisma e autenticação Clerk.

## Desenvolvimento

```powershell
npm ci
# Configurar .env.local a partir de .env.example
npm run dev
```

Validação antes de publicar:

```powershell
npm test
npm run lint
npm run build
```

As migrações de produção são aplicadas com `npx prisma migrate deploy`, usando a ligação da base correta. Não executar operações de reset numa base existente. Ver [preparação da BD](maintenance/DATABASE.md).

## Sincronização

O cron consulta as cinco fontes diariamente às 02:00 UTC: FPC, Cabreira, Stop and Go, Recorde Pessoal e Apedalar. O plano cobre o ano atual e o seguinte; a recolha histórica está desativada. O workflow persiste as etapas e uma reserva na BD impede execuções simultâneas.

A recolha guarda factos mínimos, respeita recusas de acesso e reutiliza páginas já descarregadas. A classificação e as correspondências entre fontes passam por regras partilhadas. Datas, modalidades e escalões sem evidência ficam por confirmar. O painel de qualidade distingue resultados válidos de falhas de leitura; processados não significa provas novas.

- [Classificação automática](maintenance/SCRAPER-CLASSIFICATION.md)
- [Auditoria atual dos scrapers](maintenance/SCRAPER-AUDIT-2026-11-02.md)
- [Favoritos e novas edições](maintenance/FAVORITE-EDITIONS.md)
- [Agenda, estados pessoais e avisos de alterações](maintenance/PERSONAL-CALENDAR-2026-11-02.md)
- [Notificações mobile](maintenance/favorite-push.md)
- [App instalada: offline e atualizações](maintenance/PWA-2026-11-04.md)
- [Privacidade e retenção](maintenance/PRIVACY-OPERATIONS.md)
- [Revisão legal e limites](maintenance/LEGAL-COMPLIANCE-2026-10-30.md)
- [SEO](maintenance/SEO-2026-10-28.md)

Emails e push exigem configuração do serviço e consentimento de cada utilizador. Um estado pessoal como «Já estou inscrito» não efetua uma inscrição na organização.

## Organização

- `app/`: páginas, componentes, APIs, workflows e regras do calendário.
- `prisma/`: schema e histórico completo de migrações.
- `tests/`: testes e fixtures locais.
- `public/`: recursos publicados, incluindo ícones e service worker.
- `maintenance/`: ferramentas operacionais e relatórios técnicos com datas e limites de validação.
- `.agents/skills/`: cópia canónica das ferramentas de apoio aos agentes.

Os recursos da marca são gerados com `npm run brand:icons`. Para exportações destinadas ao Google, executar `node maintenance/export-google-logo.mjs`; a pasta `exports/` é gerada e não entra no Git nem no deploy.

Credenciais, bases locais, backups e `.qa-tools/` ficam fora do Git. As rotas de compatibilidade e as migrações antigas são conservadas para instalações e clientes existentes.
