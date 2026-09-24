# PostgreSQL deployment

The migrations now reproduce the PostgreSQL schema used by the application. The former SQLite-only initial migration has been replaced with a PostgreSQL baseline.

For a new empty PostgreSQL database, run `prisma migrate deploy` and then generate Prisma Client. Both migrations have been tested together in a disposable schema inside a rolled-back transaction.

For an existing database, first compare its schema with the baseline using `prisma migrate diff`. Only if there is no drift and no existing migration history, mark `20260813112351_init` as applied using `prisma migrate resolve --applied 20260813112351_init`, then run `prisma migrate deploy`. Do not run the baseline CREATE TABLE statements over existing tables.

The configured database was verified to match the baseline exactly, baselined, and migrated on 2026-09-23. Do not repeat the resolve step there.

The additive migration adds nullable `Event.listSummary` and an invalidation trigger. It does not overwrite original event data. Any change to the source fields used for locality/registration summaries invalidates the summary, regardless of which scraper or repair script writes it. The next uncached list read refreshes missing summaries with optimistic concurrency checks.

To precompute summaries before serving a new deployment:

```powershell
node --env-file=.env --env-file=.env.local maintenance/backfill-list-summaries.mjs
```

List results have a 60-second server cache and a 300-second CDN cache. Existing offline browser data remains a fallback, not the authority after a successful fresh response.
