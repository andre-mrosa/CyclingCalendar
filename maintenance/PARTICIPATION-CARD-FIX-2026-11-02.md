# Favorites card interaction and layout correction

The event title's stretched `::after` link covers the card at z-index 1. The new participation select had no positioned layer above it, so pointer clicks hit the event link. Its block label and repeated explanatory paragraph were also placed in the flex heading row, reducing title width and increasing every card's height.

Participation now sits beside location/modality as a compact control, outside the heading. Its label is accessible and includes the event title; the explanatory note appears once in the favorites overview. Guest rows have no redundant sign-in paragraphs. Saved states remain unchanged. Progress/error feedback is compact, with accessible live announcements and a retry button.

The event card explicitly positions interactive controls and secondary links above the stretched title link. This also protects the original-source link and future controls instead of fixing only this select. The title/background still opens the event detail. Mobile selects retain 44 px touch height; styles use existing palette variables and respect reduced-motion preferences.

Validation: 337 automated tests; ESLint and production build. Browser QA uses long titles and multi-day events. Checks include actual select clicks, DOM pointer hit-testing (`elementFromPoint` resolves to SELECT), keyboard selection, persistence after detail/back navigation, independent title navigation, and a 390 px responsive viewport with no horizontal overflow. Mobile control height was 44 px and the title retained the card's available width. Earlier programmatic `selectOption` checks alone did not detect the click overlay, so pointer hit-tests are required for card controls. Test data and screenshots are isolated under `.qa-tools/participation-card-*`; no real personal statuses were changed during QA.

## Registration labels for registered events

The shared participation-state hook now supplies the compact select, registration badges and deadline overview from one account-scoped SWR cache. Registered events hide opening/closing badges wherever the shared badge is rendered and are excluded from the upcoming registration-deadline summary. Other statuses restore the labels and summary immediately after saving. The next event, favorites, agenda membership and source registration facts remain unchanged. Matching includes merged event aliases; signed-out users receive no private participation states.

Validation: opening and closing fixtures in the isolated browser QA, registered/going/interested transitions, restored deadlines and a 390 px mobile viewport; 337 automated tests, ESLint and production build. No production personal states or emails were changed.
