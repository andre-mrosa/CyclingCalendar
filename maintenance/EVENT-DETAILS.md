# Event detail recovery — September 2026

Apedalar and Recorde Pessoal now import the public event description, schedule,
prices where available, and document links. Registration forms and participant
lists are excluded. FPC descriptions embedded in legacy `programa` HTML are
exposed in both the detail API and standalone page, with navigation removed.

Daily synchronization now includes FPC detail enrichment. It prioritizes upcoming
unchecked events, follows FPC links in merged sources, preserves existing useful
programs, and records attempts separately in `detailsCheckedAt`. Empty/failed
pages are retried after seven days instead of blocking later events. This does
not remove the production requirement for `CRON_SECRET`.

Migration `20260925120000_detail_checks` was applied on September 25. It adds one
nullable field and does not modify existing event content.

`node --env-file=.env --env-file=.env.local maintenance/enrich-upcoming-events.mjs`
previews gap filling for upcoming events. Add `--apply` to write with per-event
backups and optimistic concurrency checks, or `--fpc-only` to restrict the source.
Backups are in ignored `maintenance/backups/`; do not commit them.

The September 25–28 recovery filled 28 Apedalar/Recorde Pessoal events and six FPC
programs. One additional FPC attempt was reverted to its original program when
the source no longer contained valid detail. Some races still have only calendar
metadata, invalid source links, or external pages not supported by these parsers.

Mobile checks cover saved searches, rich descriptions, program tables, and
expanded filters at 320, 390 and 430 px. Run `maintenance/verify-mobile.cjs` with
`PLAYWRIGHT_PACKAGE` and `MOBILE_TEST_URL` pointing to the installed test runtime
and a local server. Test data is intercepted in the browser; no live writes occur.
