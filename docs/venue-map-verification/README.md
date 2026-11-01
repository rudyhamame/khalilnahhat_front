# Venue map verification — 2026-10-31

Implemented for the **browser** app's **Complete your booking** section. No Android feature edits remain. No deployment, production migration, real booking/payment/email action, account purchase, or live provider credential configuration was performed.

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

`runtime-fixture.png` intentionally has **no geographic basemap**: the temporary source-free QA style exercises rendering, clustering and controls without borrowing a production credential or presenting fabricated geography. Production uses the real editable vector style; actual licensed tiles/glyph delivery, provider quota/account settings and real Geoapify search remain unverified until the owner supplies credentials. The fixture style is not shipped. Screenshots show test data, never production venue claims.

## Existing failures outside this feature

The separate `src/echo/eventOrder.test.js` file has four failing assertions for older labels/navigation/retired home markup. Repeating it with the pre-map QuotePage behavior produced the same four failures. The configured `npm test` suite passes (56 tests).

Extended backend event-order tests have one pre-existing failure: frontend and backend core helper files differ because the frontend already exports `voiceGreetingText`, while the backend does not. Git HEAD comparison confirms this mismatch predates these edits. The JSON contract is synchronized; the coordinate-validation addition is identical on both sides. The questionnaire assertion now correctly excludes hidden optional map metadata and passes. No unrelated helper/UI changes were made to force these baseline checks green.
