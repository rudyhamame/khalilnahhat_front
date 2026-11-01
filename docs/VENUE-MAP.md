# Echo booking venue map

The browser map lives in **Complete your booking → Venue Details**. It searches live places through the authenticated API. A customer previews a result, then explicitly accepts it for the booking, or enters a location manually. There is no saved-venue directory, saved-venue count/message, directory editor, event-link browser, or automatic venue-record lookup.

The map uses MapLibre and the original editable charcoal OpenMapTiles style. OpenFreeMap provides the default tiles/glyphs without a key. Geoapify search uses `VENUE_SEARCH_API_KEY` only on the backend, with `VENUE_SEARCH_PROVIDER=geoapify`; never put that secret in a Vite variable. Optional licensed MapTiler configuration remains supported through the existing `VITE_VENUE_TILE_PROVIDER`, `VITE_VENUE_TILE_KEY`, `VITE_VENUE_STYLE_URL`, `VITE_VENUE_TILEJSON_URL` and `VITE_VENUE_GLYPHS_URL` overrides.

Search areas include All, Ontario, and inside/outside the GTA. Local searches use named POIs and geocoding fallbacks; global searches omit the full-world rectangle and use text geocoding. Results are transient and source-attributed. Coverage is not exhaustive. The API limits search to 10 requests/minute/user, two concurrent upstream searches per process, an 8-second total deadline and 10 returned results. Multiple replicas require a shared gateway quota.

Acceptance copies address, optional coordinates and provider provenance into the existing account-private booking draft. It does not submit a booking or change availability. Manual entry belongs only to the booking; coordinates are optional and only used after placing/dragging a pin. No capacity or interior area is guessed. No venue results are persisted by the search API.

The shared venue model, directory CRUD endpoints, migration script/startup indexes, directory event associations and booking `recordId` metadata have been removed at the user's request. Existing database data and historical bookings were not deleted or rewritten. No map-directory migration is needed.

The borderless charcoal glass form overlays the map; confirmation remains opposite the search controls. My location is an accessible glass icon button and requests location only when pressed. The map retains clustering, camera persistence, a separate bundled MapLibre worker, rotation/reset-north controls and visible attribution. Preserve the OpenFreeMap/OpenMapTiles/OpenStreetMap attribution and Geoapify result attribution; provider licenses still apply.

Validation: `npm test`, `npm run lint`, `npm run build`; backend `node --test test/venue-map.integration.test.js src/event-drafts.test.js`. Historical verification is in `docs/venue-map-verification/README.md`; its earlier directory behavior is superseded by this removal.

Primary provider references: [OpenFreeMap](https://openfreemap.org/), [Geoapify](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/), [MapLibre](https://maplibre.org/maplibre-gl-js/docs/).
