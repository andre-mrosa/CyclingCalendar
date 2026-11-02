# Personal calendar improvements — 2 November 2026

## Searches across devices

`/api/searches/saved` stores at most 20 searches per authenticated account. Every read/write/delete is scoped to the authenticated user, irrespective of supplied user IDs. Serializable transactions protect capacity and import/replace operations. Only supported calendar paths and normalized filters are accepted; precise GPS filters cannot be uploaded.

Existing local searches belonging to the same account are imported once per browser. Import preserves newer account copies, matches IDs/names, and rolls back the whole import if capacity is exceeded. Original browser records are kept independently from the account cache, so failed imports cannot erase them. Guests continue using browser storage. Browser copies are outside server erasure; the privacy notice explains this. Offline users can view cached searches; account edits require connectivity.

The selected-search highlight follows effective filters, including searches loaded from the account. Deletion in one browser is not undone by another browser replaying its migrated cache.

## Personal event status

Favorites show optional Interested / Planning to attend / Already registered states. These are private declarations, not registration actions, and never cause registration or payment. Canonical event IDs and known aliases are reconciled when updating/removing a state. The API validates public event availability, supported states, origin, account ownership and a 500-state account limit. Reads are private/no-store.

## Favorite change emails

Fresh explicit consent and a verified primary email are required at `/api/alerts/changes`. The new preference defaults off and is independent of retired legacy alerts. Activation captures the current favorites as a silent baseline; it does not email historical differences. Both manual and followed-edition favorites are considered.

Only a newer source check can create notices. Notices contain before/after known dates, published locations, or an explicit cancellation in the published title. Unknown values and missing records are not cancellations. Known facts survive temporary disappearance and alias changes. Removing a cancellation word does not assert reinstatement or repeatedly announce the same cancellation. Removed favorites are pruned from the current reference.

Emails persist the exact recipient, body and provider idempotency key before transport, recheck enabled/revision before sending, and use a tokenized lease. The same pending message/key is retried after uncertainty. More than 23 hours of uncertainty suspends further sends for review instead of risking a duplicate; the user sees this condition and can disable/re-enable to establish a new baseline. Maximum one digest per Lisbon day. `favorite-changes` cron runs at 04:15 UTC, authenticates with the existing cron secret, and uses a unique day marker. No additional sender credentials are needed.

Account activity erasure deletes saved searches, participation states and change preferences including pending messages. Daily run markers expire after 30 days. Existing favorites, edition preferences, push schedules and legacy retired endpoints retain their behavior.

## Empty searches and discovery

Zero-result searches offer actual alternative result counts. Counts use the same date, category, modality and planning rules as the calendar. Favorites, agenda, active source selection and forced page scopes remain constraints. Suggestions are explicit user actions and equivalent result sets are deduplicated.

`/calendarios` links existing modality and source-regional collections and new `/meses/YYYY-MM` collections. Existing collections support validated month/modality/regional facets with stable canonical URLs and pagination. Records are deduplicated. Multi-day events count in overlapping months. Invalid months return 404; valid empty collections are noindex. Sitemap month entries cover only months with records in the next 12 months. Regional labels remain source association classifications, never inferred venues. Pages contain factual dates/source links and original explanatory text, without fabricated offers, venues or coverage claims.

## Validation

- 337 automated tests, including new account isolation, search import, private statuses, consent/baseline, fresh-source comparisons, cancellation/missing/alias handling, exact pending retries, disabled delivery, alternative counts and month overlap.
- PostgreSQL integration in a temporary isolated schema: import preservation, transactional rollback on capacity, concurrent capacity protection, private status keys, durable pending JSON/idempotency and unique daily markers. Schema removed afterwards; zero production event writes and zero external emails.
- Browser QA with fictional data and no credentials: existing local migration, account save, retrieval/application and deletion across two distinct browser-storage origins; no resurrection after reload; real alternative counts and application; private status changes visible in the second context; opt-in and disable controls; monthly rendering. Responsive viewport checks at 390 px with no horizontal overflow. This simulates separate devices; it is not a physical-phone test or a real email delivery test.
- Logs, integration scripts and screenshots are ignored under `.qa-tools/personal-calendar-*`.

Additive migration: `20261102000000_personal_calendar`; applied successfully before deployment. No existing user is subscribed and no scraper rerun is necessary.
