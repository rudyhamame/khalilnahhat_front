# Echo brief implementation review — 2026-10-12

Checkouts: `/home/rudy/projects/khalil-front`, `/home/rudy/projects/khalil-back`.
Reference: `/home/rudy/Desktop/MASTER WEBSITE DEVELOPMENT BRIEF.txt`.
The brief is a requirements reference, not authorization to buy services, publish private media, send mail, or run payment transactions.

## User decisions overriding the original brief

- Keep manual payments recorded by administrators. Do not restore Stripe or require online checkout.
- Replace the earlier lookalike DJ assets with generated illustrations preserving the supplied artist reference. Instagram reference: https://www.instagram.com/khalil_nahhat/ .
- Transparent portrait cutout where suitable; subtle scroll-responsive background movement.

## Implemented in this review

- Silver Haze/Eclipse/Jade/Aqua visual system, Anton/Noto Sans and Cairo/Noto Sans Arabic.
- Photographic split hero, four coordinated slides, manual selection and pause, reduced-motion support.
- Bounded passive-scroll parallax with requestAnimationFrame; disabled for coarse pointers and reduced motion.
- Responsive menu, accessible labels/current page, keyboard Escape, skip link, clearer quote and account entry.
- Dedicated services overview and special-effects service page; links from all six service cards.
- Generated assets in local public/echo plus lossless sources in design/source. Do not describe these as photos of actual past events or actual rental models.
- About artist cutout, gallery artwork section, service illustrations, consistent login/register page in both languages.
- Homepage featured content reads published media/reviews. No fabricated reviews or fake playable mixes.
- Quote questionnaire open before authentication; explicit device draft saving, return after sign-in, new setup/music/entrance/MC/announcement fields.
- Equipment and service lines submitted together; integer quantities and preserved minimum quantities.
- Backend validates catalog identity/availability/minimum quantities, future calendar dates and times; preserves new questionnaire fields.
- Expired accepted quotes cannot receive new deposits; paid/confirmed/cancelled requests cannot be repriced as new quotes.
- Reserved administrator username cannot be claimed through public registration.
- Native gallery dialog contains focus, closes on Escape, returns focus to triggering tile.
- Catalog response remains free of internal equipment prices.

## Acceptance status / remaining work

The full brief is NOT complete. Do not label it complete until workflows below are implemented and demonstrated.

| Requirement | Current state / work still needed |
|---|---|
| Brand assets | Six generated assets ready; full original brand guideline attachment was not supplied. Get approved actual equipment model photographs separately. |
| Public site | Redesigned core pages verified locally. Live static site still serves an earlier build; deploy the reviewed dist through the existing hosting workflow. |
| Quote flow | Questionnaire and owner-scoped API exist; real end-to-end customer/admin workflow still requires a dedicated test account and email delivery validation. |
| Drafts | Explicit save on this browser/device; account-synced cross-device drafts are not implemented. |
| Documents | Secure private document upload/storage, contracts/invoices and client download permissions are still required. Do not use public Cloudinary URLs for private client files. |
| Manual payments | User-approved. Verify concurrent admin ledger mutations, cancellation release, refund/void reconciliation and rollback behavior with database-backed tests. Date uniqueness alone is not a full transactional booking workflow. |
| Expiration | Seven-day default and sweep/reminders exist; expiry notification and acceptance email coverage need verification/implementation. |
| Equipment | Internal pricing hidden; quantities/minimums validated. Real quantityOwned and stockTracked values need owner input; placeholders cannot prove availability. |
| Content admin | Equipment/media/review/meeting CMS exists; broad bilingual website text/service editing and dashboard consistency remain incomplete. |
| Client portal | Existing event/quote/payment/planning UI exists but still contains legacy design and English-only areas. Finish unified bilingual navigation and event-first information architecture. |
| Meetings | Slots, cancellation/rescheduling and ICS exist. Provider calendar sync is not implemented. Concurrency on reschedule/cancel needs database tests. |
| Streaming | Legacy streaming infrastructure exists; scheduled multi-event public/private/password access and unique links are not demonstrated. |
| Mix player | Existing playback supports seek/volume/share; verify playlist advancement, paused/ended states, and rejected-play feedback. |
| Security/privacy | Password hashing and route checks exist; perform full authorization/upload/session audit, rate limits, backup/restore drill and approved privacy policy. No compliance certification is claimed. |
| SEO/performance | Metadata and sitemap exist; SPA crawlability, production performance and heavy legacy modules remain open. Build still warns about a >500 kB JS chunk. |
| Mobile apps | No completed iOS/Android apps. Document shared API/auth contracts, scope, phases and estimates. |
| Proposal/training | Hosting/services/costs/timeline proposal, administrator training and operational runbook are outstanding. |

## Verification performed

- Frontend production build passes.
- Eight frontend tests pass, including equipment-plus-service preservation.
- Five focused backend tests pass for event validation, retained details, catalog minimums, accepted expiry and quote totals; server syntax check passes.
- Scoped lint has no errors; one existing Fast Refresh export warning remains.
- Browser: English desktop, 390px mobile English/Arabic, mobile menu, draft save/reload/clear, gallery open/Escape/focus restore.
- Read-only HTTP: health and 15-row catalog; no internal price keys in catalog.
- Backend local service restarted after checks; no real quote/payment/account creation or external email test submitted.

## Next Claude pass

Preserve the user decisions and reviewed design. Start with the client/admin portal and private documents. Implement meaningful database tests before claiming booking safety. Never swap in an invented identity, generic equipment photographs, fabricated testimonials or fake audio. Work against the acceptance table above and report evidence, not a general completion claim.

Source lint also reports an existing unused `fallbackPoster` parameter in LiveStreamPlayer. No lint errors. The six optimized artwork assets total about 1.2 MiB; the folder also retains three older unreferenced WebP variants. Public live static deployment has not been changed by this review.

## Theme and hero follow-up

Both Light and Dark are now selectable from bilingual header controls and persisted with `echo-theme` in localStorage. Dark is the default for a first visit. Light restores Silver Haze surfaces; Dark uses Eclipse Green surfaces and silver text. Both keep jade accents and a dark cinematic hero for image readability. The first Home section uses edge-to-edge background imagery, foreground copy, quiet controls and a portrait-specific crop preserving the sunglasses/headphones. Full-viewport sizing and reduced-motion behavior remain. Browser verified both background colors and preference persistence after reload.

## Percussion console

Home services now fit one viewport below the sticky header. Six rubber-pad buttons use short original Web Audio percussion, selected-service descriptions and matching detail links. The physical controller styling includes functional keyboard-accessible Tone/Volume sliders and mute. Browser activated all six pads and verified each destination; Tone/Volume values and mute state change correctly. Section plus header measured 996.7px in a 996px viewport (subpixel rounding). Build and scoped lint pass. Sound requires browser audio permission/user activation; no autoplay.
