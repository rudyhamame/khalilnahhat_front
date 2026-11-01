# Venue map verification — 2026-10-31

Implemented for the **browser** app's **Complete your booking** section. No Android feature edits remain. The initial implementation checks below used isolated fixtures. Live deployment and free provider setup were subsequently completed; see the live verification record. No real booking/payment/email action or paid account purchase was performed.

## Live deployment — 2026-10-31

- Frontend `57186ba` deployed to https://echo-khalil.onrender.com; the public style serves OpenFreeMap vector tiles/glyphs without a browser key.
- API `023fbdc` deployed to https://echo-khalil-api.onrender.com. Render startup logged `Venue map indexes ready.` and service live; the additive production index migration completed.
- Created Geoapify project **Echo DJ venue search**, verified **Free / $0 month / 3,000 credits per day / 5 requests per second**. No card or paid plan added. Its key is stored only in the Render API environment with `VENUE_SEARCH_PROVIDER=geoapify`.
- Geoapify key restricted to the API region’s Render egress ranges `74.220.48.0/24` and `74.220.56.0/24`. Revisit this restriction if the service region or egress changes. No key is committed or placed in Vite variables.
- Actual authenticated Echo browser booking section rendered geographic streets/labels and live Geoapify results through the production API. Searching “Massey Hall” returned the real venue at 178 Victoria Street; its detail panel showed coordinates and unknown capacity/area, with selection/save actions available. No console errors/warnings were captured. Saved directory is currently empty; external search works.
- MapTiler Free was not used for commercial production; OpenFreeMap is the no-key default. No MapTiler paid subscription was created.
- Live screenshot: [booking map](live-booking-map.jpg). Search was read-only: no venue chosen, directory record created, booking submitted, payment made or email sent.

## Passing checks

- `npm test`: 56/56 pass, including the 3 new venue-map tests.
- `node --test src/echo/venueMapCore.test.js`: 3/3 new checks: nullable measurements, distinct source identities, valid editable MapLibre style, provider URL overrides, and preservation of signed precise coordinates/venue ID through booking normalization.
- `npm run lint`: no errors; existing application warnings remain. New production map files introduce no warnings.
- `npm run build`: succeeds; map, bundled MapLibre worker and supporting CSS are separate lazy assets. Existing large-bundle warnings remain.
- Backend `node --test test/venue-map.integration.test.js src/event-drafts.test.js`: 13/13 pass. Uses an isolated temporary real MongoDB, existing authentication guards, and test-only users/records. Tests actual geospatial queries, additive migration run twice, null rooms, admin creation/editing, optimistic conflicts, denied customer writes, existing-event links, customer event ownership, missing search credentials, bounded Geoapify fixture response, rate limits and rejection of forged saved-venue coordinates before any booking/notification write.
- Node syntax and Git whitespace checks pass for the changed code.

## Browser checks

Used the [browser-act skill](/home/rudy/.codex/plugins/cache/openai-curated-remote/browser-act/0.1.6/skills/browser-act/SKILL.md), a temporary local harness mounting the **actual HomeAvailability, VenueMap and VenueMapCanvas components**, and conspicuously labeled QA fixtures. The temporary HTML/JSX/style files were removed after checks.

- Actual Complete your booking placement; selecting a saved fixture and pressing “Use this venue” populated name/address/city/postal/country and canonical saved ID, latitude 43.6532, longitude -79.3832, source.
- Desktop side panel showed nullable capacities/area as Unknown.
- Administrator form accepted creation details, map pin placement and existing-event linking; captured test request preserved the selected coordinates and event reference. Database-backed authorization/persistence tested separately above.
- Actual MapLibre worker initialized successfully: 25 nearby test points formed one rendered cluster; cluster activation expanded zoom and split into smaller clusters. Vite's documented `?worker&url` setup is included to prevent a runtime worker failure that a build alone would miss.
- Navigation/rotation/reset-north controls and session camera persistence checked.
- Location call count was zero before pressing My location; a denied-location callback produced the explicit message while retaining the venue map/source.
- 390px nested mobile viewport: map and booking panel displayed, page scrollWidth stayed within the viewport; existing CSS hiding the review panel was overridden only for the new booking map panel. Mobile details use a bottom sheet.

`runtime-fixture.png` intentionally has **no geographic basemap**: the temporary source-free QA style exercises rendering, clustering and controls without borrowing a production credential or presenting fabricated geography. The later live check verified actual OpenFreeMap tiles/glyph delivery and Geoapify results; see the live verification record. The fixture style is not shipped. Screenshots show test data, never production venue claims.

## Existing failures outside this feature

The separate `src/echo/eventOrder.test.js` file has four failing assertions for older labels/navigation/retired home markup. Repeating it with the pre-map QuotePage behavior produced the same four failures. The configured `npm test` suite passes (56 tests).

Extended backend event-order tests have one pre-existing failure: frontend and backend core helper files differ because the frontend already exports `voiceGreetingText`, while the backend does not. Git HEAD comparison confirms this mismatch predates these edits. The JSON contract is synchronized; the coordinate-validation addition is identical on both sides. The questionnaire assertion now correctly excludes hidden optional map metadata and passes. No unrelated helper/UI changes were made to force these baseline checks green.

## Venue panel layout follow-up

Moved the venue-map contents into `.avail-venue`, retained `.avail-venue-head`, and removed `.vm-toolbar` from the rendered component. All search/filter/editor inputs appear in the left sidebar; the map fills the remaining right side edge to edge. The review remains a separate narrow column. Browser checked admin editor placement, no console errors, and a 390px viewport with page width exactly 390px. Restored desktop viewport afterward. All 56 tests, lint (existing warnings only), build and whitespace checks pass. No booking or directory data was submitted. [Desktop screenshot](split-venue-layout.jpg).

## Flexible venue search — 2026-10-31

Business-name Places lookup now precedes address geocoding, with a bounded partial-name retry. Search defaults to the Greater Toronto Area instead of the zoomed viewport; This map view remains available. External results are no longer silently removed outside the old viewport, and the camera fits returned locations. A new search clears the previous selected result. Saved matching accepts partial/reordered words and optional possessive apostrophes.

Live API `55fdd29` was independently confirmed as Render’s successfully deployed commit. Authenticated browser queries returned ten The Keg locations and Lara’s Restaurant at 155 Consumers Road, Toronto; Lara’s detail showed the real coordinates with capacity/area still Unknown. No venue or booking was saved. Additional apostrophe-omission hardening is in API `363874a`. All 56 frontend tests and 15 focused backend tests pass; lint/build pass with existing warnings. Regressions exercise named POIs, partial retries, straight/curly/omitted apostrophes, address fallback, bounding, provenance, quota and saved matching.

Final live check: API `1020678` is Render’s successfully deployed commit. The exact input **Laras** (no apostrophe) now returns **Lara’s Restaurant, 155 Consumers Road**, and selecting its result opens the correct details. The final fallback retries omitted possessives before amenity-only autocomplete; residential autocomplete results are excluded from business-name suggestions. The production frontend bundle also contains the new Greater Toronto Area/Search area controls. No console warnings/errors observed. Final backend run: 15/15 pass. [Verified flexible lookup screenshot](flexible-laras-search.jpg).

## Venue Details form redesign

Search now has a visible field label, search icon and primary action; a separate filter card groups area, venue type and capacity. Results use quieter selectable cards, and the admin add action sits after discovery. The venue editor groups essentials/location, pairs related short fields, uses a standard verification checkbox, and puts optional rooms/event links in expandable sections with Save/Cancel actions. Editing hides discovery controls and opens at the first field. The retained Venue Details heading stays outside the scrolling form; the map still fills the entire right side.

Browser verified desktop editor open/cancel, its initial scroll position, no console errors/warnings, and 390px mobile width with no horizontal overflow and all fields inside the viewport. Desktop viewport restored. No record or booking saved. All 56 configured tests pass; lint has no errors or new map warnings; build and whitespace checks pass (existing warnings remain). Screenshots: [search form](venue-form-redesign.jpg), [venue editor](venue-editor-redesign.jpg).
