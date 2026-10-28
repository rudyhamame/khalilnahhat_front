# Echo brief implementation review — 2026-10-12

## Services vinyl reference update — 2026-10-24

User's Pinterest wheel reference adapted into a CSS vinyl deck with six service selectors and adjacent real-catalog equipment recommendations. Combined Services & Equipment section is immediately after the first hero viewport; artist introduction follows it. Equipment suggestions use existing catalog IDs, hide prices and respect minimum quantities through the existing quote cart. Missing product photographs use line icons. Original percussion cards remain available to other pages. Browser verified section starts at y993 after the 993px hero, lighting selection loads moving heads/trussing/uplights, and no page horizontal overflow. Build passes with existing warnings. Equipment associations are initial suggestions, not admin-editable mappings or required-package claims. No production deployment.

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

## YouTube hero showcase — 2026-10-13
Curated four videos and four Shorts from https://www.youtube.com/@djkhalilnahhat8943 . Both appear below the Home tagline, with independent previous/next controls and mobile format buttons. Actual privacy-enhanced embeds, no autoplay; direct YouTube fallback links. Browser player readiness verified for retained selections; two unavailable embeds excluded. Featured video playback progressed to 0:40 of 3:14. English desktop and 390px mobile English/Arabic checked without horizontal overflow. Channel portrait shifted to right edge without editing the source image. This is a curated selection, not an automatic feed of new uploads.

## Song performance and headphones admission — 2026-10-23
The approved current test song drives ten clean-reference key poses using measured onsets and the real playback time. Four clearly distinct mixer hand destinations and two raised-hand poses are integrated. First play runs the existing eight headphones-on frames before allowing audio; cancellation rejects stale completions. Full performer/controller stays in VP1; idle scroll sequence retained before performance. Browser confirmed paused/time0 during entrance, then real playback and pose8 at7.28s, pause returns pose0. At1920x953 image bounds y64..941, and390x844 y317..832 with no horizontal overflow. These are discrete generated pose changes, not interpolated continuous hand animation. Generative texture/equipment variation remains. All31tests pass; lint has two existing warnings; build passes with existing bundle-size warning. No production deployment.

## Reverse headphones and return framing — 2026-10-23
Pause/stop runs the same clean eight-frame headphones sequence backwards, and eases back to the initial close-up over5.2seconds. Audio pauses immediately. Buffering, seeking and tab visibility changes only suspend gestures and do not trigger removal. Replay can cancel an in-progress return and prepare headphones again. Reduced motion resets directly. Tests32pass, lint has the same two existing warnings, build passes.

## Local split-channel player — 2026-10-24

Per the user's placement correction, Vocals, Drums, Bass and Other music are direct `.echo-channel-strip` children inside the existing Channels partition's `.echo-channel-strips`, alongside Master and Mic. All six use vertical faders and matching meters in a three-column grid. Separation controls also live in Channels; no split-channel panel is placed in the equalizer column. Each separated channel has gain, mute and solo. The local backend runs one cached Demucs HTDemucs CPU separation job at a time for published recordings; only `/api/player/stems` is proxied to the local worker. Original playback remains available during processing. Separated AudioBufferSources share one audio-context start/seek offset; the original media element remains the clock with its output silenced in split mode. Equalizer/master output still apply. Local model/interpreter/cache are ignored runtime files. Production deployment and worker installation remain separate work. Setup: backend `docs/STEM-SEPARATION.md`. Separation can retain bleed.

Verified the actual Esh Maana Remix separation locally: four FLACs, each 7,938,471 stereo samples at 44,100 Hz (180.01068 seconds), finite samples with distinct nonzero signal. Cache survives backend restart and serves byte ranges (206). Browser confirmed real decoded-channel playback, active meters, Vocals solo silencing the other three meters, and playback continuing after seeking to 60 seconds. The browser-checking skill exposed and helped fix narrow-column overflow and cached error/file-serving behavior. Source tests and build pass; existing lint/bundle warnings remain. No public deployment.

## Cloudinary media and Blender uplight — 2026-10-26

86 public media assets stored in Cloudinary; all 86 downloaded successfully and matched SHA-256 checksums. Existing artwork/audio/model references now use Cloudinary URLs, including dynamic pose/gallery lookups. No client document access changes. User-supplied uplight photo modeled locally with Blender 4.5.9 LTS after hosted TRELLIS GPU quota rejection. Native .blend, GLB, reference and studio preview are all in Cloudinary; rebuild source is design/models/uplight. Uplights participates in the existing lighting equipment wheel and interactive viewer. Manufacturer identity, exact dimensions and electrical capabilities remain unverified.

Verified rendered uplight and equipment thumbnail in Chrome at localhost:5176, loaded Cloudinary GLB with rotation/reset/download controls. 52 configured frontend tests and seven avatar tests pass. Compressed avatar retains each 102-joint skin binding and required mouth/blink morph names; decoder is bundled. Lint has no errors (three existing warnings); production build passes (existing chunk-size warning). No frontend publication/deployment performed.

## Shure microphone equipment model — 2026-10-26

User-supplied dual handheld/receiver photo recreated locally in Blender 4.5.9 LTS and connected to catalog key `shure-mics`. Nine-material-group GLB, native Blender file, reference and studio preview are stored in Cloudinary; all four downloads match SHA-256. Public-media manifest now has 90 entries. Receiver BLX88 marking is based on the photo; RF band, capsule, dimensions and unseen rear connections are unverified. Native parts remain editable. The shared loading-line suppression is preserved. Chrome verified main preview and equipment thumbnail; lint/build pass with existing warnings. No frontend deployment. Rebuild source and deliverable links: models/shure-microphones/README.md.

## Elite, spark machine, JBL system and dry ice models — 2026-10-26

Completed photo-guided local Blender models for `elite-15`, `sparklers`, `jbl-system` and `dry-ice`. Each model's native Blender source, GLB, preview and supplied photo are stored in Cloudinary (16 files); all downloads matched SHA-256 and all GLBs passed container/size/scene checks. Shared media manifest contains 106 entries. Elite is added to the Sound Systems recommendations; existing catalog identities and stock/prices remain unchanged. Exact model specifications are not inferred from illustrative geometry. JBL represents the reference arrangement, not validation of catalog SRX/STX identities. Native build sources and cloud links are in design/models/elite-15 and design/models/equipment-batch. Shared loading-line suppression remains.

52 configured frontend tests pass. Lint has no errors and three existing warnings. Production build passes with existing bundle-size warnings. Local browser confirms equipment selection and loaded Cloudinary model/thumbnail for each of the four entries. No frontend publication/deployment performed.

## QSC K12.2 model — 2026-10-26

Created photo-guided local Blender model and connected existing `qsc-k122` equipment key. Curved physically perforated grille, single woofer/upper horn, moulded enclosure, side handles, bumpers and badge; dimensions and ratings unverified. Four files (GLB/native .blend/preview/reference) are stored in Cloudinary and match SHA-256 on download. Media manifest now has 110 entries. Browser verified main model and thumbnail. Shared loading line remains hidden. 52 frontend tests pass; lint/build pass with existing warnings. No frontend deployment. Source and links: models/qsc-k122/README.md.

## Equipment grid and review presentation — 2026-10-26

User replaced the equipment wheel with a two-column grid showing all service-associated items. Grid tiles have no inner padding, visible names or selected captions; accessible button names and selected state remain. Bright studio surfaces, stronger neutral lighting, and larger model framing improve black equipment contrast. Main preview gets a wider center column and full available height. Connections/status/reference/disclosure footer is removed from the shared preview per user request. Review side cards retain the same content/gradient as the selected card, dimmed to 40%, with no background images.

Chrome verified all four Sound Systems grid items are present, selected preview works, footer absent, and dimmed review cards have no photographs. Lint/build pass with three existing lint warnings and existing bundle-size warnings. No production deployment.

## Full-panel 3D zoom layering — 2026-10-26

User clarified that zoom must expand within Selected Experience without center-canvas clipping. Model canvas now fills the entire stage; specification columns no longer bound it. Text/identity/meta layers stay above the model, with transparent specification-card surfaces and text shadows. Outer panel remains the viewport boundary. The temporary expanded-dialog approach was removed after clarification. Main viewer drag/zoom and reset controls remain. Browser verified full-stage canvas bounds and text above an enlarged model; build passes with existing warnings. No deployment.

## Fixed object position — 2026-10-26

User superseded the mouse-pan request: removed the temporary Move toggle and custom pointer panning, and enabled model-viewer's disable-pan property. Drag rotation and zoom remain available; reset restores the default target. Lint/build pass with existing warnings.


## Base plates / trussing — 2026-10-26

Added a photo-guided local Blender portal model: two silver box-truss towers, overhead beam, black base plates and fixing bolts. Optimized GLB, editable Blender source and studio preview are uploaded to Cloudinary and registered in both manifests. Integrated into `trussing` under Lighting. Dimensions and load rating remain unverified. See [model handoff](models/trussing/README.md). No frontend deployment performed.


## Soundcraft soundboard — 2026-10-26

Added a photo-guided local Blender mixing console with a sloped blue-grey panel, black wedge housing, twelve mono input strips, stereo/effects/master faders, coloured rotary controls, sockets and meters. Integrated existing `soundcraft` key in DJ Services and Corporate Events. Model-specific initial camera angles show the control surface from above; reset preserves that angle. GLB, Blender source, preview and supplied reference are delivered through Cloudinary. Exact model variant, dimensions and electrical ratings remain unverified. See [model handoff](models/soundcraft/README.md). No frontend deployment.


## LED screen — 2026-10-26

Photo-guided Blender model shows a front display cabinet and a rear-facing cabinet together, with slim silver edges, dark ribs, recessed handle and corner hardware. Original supplied reference is embedded as a display texture via face UV coordinates. Integrated existing `led-screen` key for LED Walls and Corporate Events. GLB, editable Blender source, studio preview and reference are stored in Cloudinary. Physical dimensions, pixel pitch, brightness and power remain unverified. See [model handoff](models/led-screen/README.md). No frontend deployment.


## Smoke machine — 2026-10-26

Photo-guided local Blender model of black vented smoke equipment with top outlet, red LED ring, off-white reservoir, cap/feed hose, side carry handles and cables. Hardware-only presentation preserves useful object size; no plume simulation is included. Integrated existing `smoke` equipment key under Special Effects. GLB, packed editable Blender file, studio preview and supplied reference stored in Cloudinary. Model proportions, exact product identity and operating ratings remain unverified. See [model handoff](models/smoke/README.md). No frontend deployment.


## CO₂ gun with tank — 2026-10-26

Photo-guided Blender effects gun with open black barrel, front grip, rear handle/trigger guard, MOKA SFX marking and supply hose. Added generic silver cylinder because no tank is visible in the supplied photo; specs explicitly identify it as illustrative. Hardware-only presentation, no plume. Integrated `co2-gun` under Special Effects. GLB, native Blender file, preview and reference stored in Cloudinary. Capacity, pressure, dimensions and operating ratings unverified. See [model handoff](models/co2-gun/README.md). No frontend deployment.

## About artist viewport — 2026-10-26

Replaced the standalone `/about` page with a redirect to the homepage About section, now a single full-screen chapter immediately before the footer. Reused the existing illustrative seated artist portrait; bilingual editorial content includes the artist introduction, three concise experience pillars, portrait attribution, and booking CTA. Discover navigation and footer link directly to the homepage anchor. Removed `/about` from the sitemap. Responsive layout checked on desktop and mobile; content remains legible without an extra scroll inside the viewport. No deployment.
