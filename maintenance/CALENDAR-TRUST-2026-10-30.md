# Calendar trust improvements — 30 October 2026

## Behaviour

- Category confirmation requires explicit source fields or literal title evidence, with a public reference and check date. Legacy inferred labels are unconfirmed. FPC, Cabreira and Apedalar extract evidence from pages already fetched; no additional source requests were introduced.
- Category filters include unconfirmed events by default, with an explicit strict option. Other filters still apply. Gender no longer replaces an age-category suggestion.
- Event pages show category evidence and the last source check. Missing evidence remains visibly unknown; this does not certify eligibility or full regulations.
- Each subsequent source synchronization records quality metrics and warnings in admin: partial collections, large volume drops, missing discipline, invalid dates, duplicate specific pages and unconfirmed categories. Shared calendar indexes are excluded from duplicate-page warnings. Warnings do not remove events. Initial baselines are created by the next synchronization.
- `/organizador` accepts factual submissions/corrections from accounts with verified primary emails, maximum five daily. Every submission remains pending until an administrator verifies the representation/reference/facts and approves. Approval is transactional and concurrency-safe. Private contacts are not published. Correcting with empty categories clears previous evidence.
- Search email alerts require explicit consent and a verified primary email. Create them under “Guardar e partilhar pesquisa”; manage them at `/avisos`. Maximum ten per account, one daily digest per search. The first digest includes existing matching future events; subsequent digests include newly matching events. No user is automatically subscribed. Private location/favourites/agenda filters are rejected. These alerts are email only.
- Delivery persists the exact payload and provider idempotency key before sending. Uncertain deliveries older than 23 hours require investigation instead of generating a fresh duplicate. Pausing clears pending delivery while retaining its cursor. Daily cron authentication and a unique day marker prevent duplicate workflow starts.

## Storage and deployment

Additive migration: `20261030000000_calendar_trust`; applied before deployment. Adds Event category evidence, source-quality snapshots, organizer submissions, search alerts and daily run markers. Existing events, accounts and favourites are preserved. No manual source-specific event corrections or invented category backfill were applied.

Retention: quality snapshots 90 days; pending/rejected submissions 90 days; approved submission contacts and review notes anonymized after 90 days; workflow day markers 30 days. User activity erasure deletes search alerts and unapproved submissions and anonymizes approved submission contacts. Privacy/terms explain these new activities in PT/EN/ES/FR.

## Validation

- 323 automated tests pass; ESLint clean; optimized Next.js production build passes.
- Real PostgreSQL integration in a temporary isolated schema: concurrent approvals publish once, invalid approval rolls back, quality comparison persists, pending JSON retries reuse the same provider key, and retention affects only expired fixtures. Temporary schema removed; zero production event writes and zero external emails.
- Browser QA with fictional data: tolerant/strict filters, create/pause/resume search alerts, organizer correction prefill and submission, admin review/approval, and new alert copy in four languages. Responsive viewport checks at 390 px for evidence and organizer form; no horizontal overflow. This is browser viewport testing, not physical-device notification delivery.
- New source-evidence coverage grows on subsequent scraper runs. Unknown categories remain honest unknowns. No real-user alert consent or live outbound email was triggered for QA.

Local logs/screenshots are ignored under `.qa-tools/trust-*`.
