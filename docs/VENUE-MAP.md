# Echo venue map

The map lives in **Home → Complete your booking → Venue details**. It replaces that section's Google iframe and public Photon address lookup. The browser app is React 19/Vite; the implementation uses MapLibre GL JS 6.16.0, the existing event-order context and authenticated Express/Mongoose API. Android is unchanged. Existing venue-intelligence research remains separate: its building/room estimates are never imported as verified directory interior area.

## Provider setup

Production uses OpenFreeMap’s hosted OpenStreetMap vector tiles: commercial use is permitted and no account, token or card is required. Place search uses a Geoapify Free project within its quota. MapTiler remains an optional alternative requiring a commercially licensed plan; its Free plan is for noncommercial use and development.

Frontend, in Vite environment (all `VITE_` variables are public and embedded at build time):

| Variable | Purpose |
|---|---|
| `VITE_VENUE_TILE_PROVIDER` | Defaults to `openfreemap` with no credentials. Set `maptiler` only with an appropriately licensed account. |
| `VITE_VENUE_TILE_KEY` | Optional public MapTiler browser key; supplying a key selects MapTiler unless the provider is explicitly configured. Restrict **Allowed HTTP origins** to your deployed Echo domain; use a separate restricted development key. Never put a MapTiler management/service credential here. |
| `VITE_VENUE_STYLE_URL` | Optional editable style JSON URL, defaults to `/maps/echo-dark.json`. Use a licensed HTTPS source in production or a same-origin URL. Any provider tokens in this document are public browser credentials. |
| `VITE_VENUE_TILEJSON_URL` | Optional replacement for `sources.basemap.url` in the default OpenMapTiles-compatible style. For a different tile schema, provide a matching style. |
| `VITE_VENUE_GLYPHS_URL` | Optional licensed glyph URL template. A different provider must also replace the default OpenFreeMap glyph endpoint. |

Backend only:

| Variable | Purpose |
|---|---|
| `VENUE_SEARCH_PROVIDER=geoapify` | Hosted geocoding/place-name/address search adapter. Other providers fail closed until an adapter is implemented. |
| `VENUE_SEARCH_API_KEY` | **Secret server-side Geoapify key.** Never use a `VITE_` name. Restrict it to server egress IP addresses where the provider supports this; use separate environment keys and provider quotas. |
| `MONGODB_URI`, `MONGODB_DB_NAME` | Existing database configuration; no additional database service. |

Search is an explicit button action. It defaults to the Greater Toronto Area, with an optional This map view scope, with a 3–160 character query, 10 results, an 8-second total timeout, no server result cache, and an authenticated 10 requests/minute/user limit. At most two upstream searches run concurrently in each API process. Authentication and bounds validation also apply to directory reads. For multiple API replicas, add a shared gateway quota (the in-memory limiter is per process), and configure provider billing/usage caps for the chosen plan. No search credential is sent to the browser. Provider failures and missing keys return useful errors; no results are invented.

The default OpenFreeMap basemap works without credentials. Selecting MapTiler without its required key produces setup instructions. Provider/network failures remain explicit; no demo basemap or invented venues are used. Without the search key, saved venue discovery/manual entry continue to work and external search explains the missing setup.

## Data and migration

Run from `khalil-back` with the intended deployment database environment:

```sh
node scripts/venue-map-migrate.js
```

The API runs this same migration automatically at startup using its existing database connection, including on Render Free. The CLI remains available for manual operations. The migration is additive and repeatable: it creates `mapvenues` with a `2dsphere` index and a compound selected-venue/owner index on service requests. It does not rewrite bookings, geocode old addresses, touch payments, or convert venue-intelligence geometry into directory data. Old bookings remain valid; their map metadata is optional.

Directory records include name, address/city/postal/country, GeoJSON coordinates, venue type, source/identifier/attribution, verification status/date, named rooms, sourced nullable seated/standing capacity, nullable interior m² with method/source, and references to existing Booking or ServiceRequest records. Unknown numbers are stored as `null` and rendered “Unknown”. Numeric zero is rejected for capacities/area. Area is never calculated from capacity or basemap buildings. Changes use an optimistic `version`, so an outdated editor receives 409 rather than overwriting another admin.

“Use this venue” updates the existing booking draft, including optional saved venue ID, coordinates and provenance. Ordinary form edits clear those map references. The existing account draft and service-request flow persist this information. Choosing a directory venue does not submit a booking, change availability, or reserve a date. Service requests containing a selected directory ID are visible as associated events without modifying existing booking records.

Read routes `/api/venue-map/{configuration,venues,venues/:id,search}` require the existing account session. Customers see only their own associated service requests and bookings (the latter matched by the existing authenticated booking email); shared directory responses omit event-link IDs. Administrator routes `/api/admin/venue-map/{venues,venues/:id,events,search}` use the existing backend `requireAdmin` guard. Only administrators see the in-map add/edit, pin placement, room editor, and existing-event linking controls. Customer venue selection grants no directory write authority.

## Attribution and licensing

The original editable charcoal style is `public/maps/echo-dark.json`. Default source: OpenFreeMap’s hosted OpenMapTiles vector tiles and glyphs. Keep the visible OpenMapTiles, OpenStreetMap and OpenFreeMap attribution supplied by TileJSON/style. Optional MapTiler mode also includes the official MapTiler logo. Replacing the provider requires updating attribution and meeting its licensing/branding obligations. Do not remove the attribution control or cover it with sheets.

Geoapify results stay transient unless an administrator explicitly saves a record, or a customer explicitly chooses a location for their own booking. Preserve source ID and attribution when saving. OpenStreetMap-derived data remains subject to ODbL; derived database redistribution can carry additional obligations. Capacity and interior measurements require their own independently supplied sources. No Google Places data, public OSM tile/search/Overpass backend, satellite imagery, prefetch/download service, or offline-map guarantee is added by this feature. Other older research/address components elsewhere in the application are outside this change.

Primary references checked during implementation:

- [MapLibre integration and API](https://maplibre.org/maplibre-gl-js/docs/), [clustering](https://maplibre.org/maplibre-gl-js/docs/examples/create-and-style-clusters/)
- [OpenFreeMap commercial use and attribution](https://openfreemap.org/), [integration](https://openfreemap.org/quick_start/)
- [MapTiler public key restrictions](https://docs.maptiler.com/guides/developer/credentials/api-key/), [Cloud terms](https://www.maptiler.com/terms/cloud/), [attribution/data licenses](https://www.maptiler.com/copyright/)
- [Geoapify geocoding API](https://apidocs.geoapify.com/docs/geocoding/forward-geocoding/), [terms and quotas](https://www.geoapify.com/terms-and-conditions/)

## Files

Frontend: `HomeAvailability.jsx` (integration), `VenueMap.jsx` (discovery/details/editor), `VenueMapCanvas.jsx` (MapLibre lifecycle, clustering, location, camera/pin handling), `venueMapCore.js` and test, `venueMap.css`, `public/maps/echo-dark.json`, `public/maps/maptiler-logo.svg`, package manifests. `QuotePage.jsx` omits hidden map metadata from questionnaire inputs. The canonical event-order contract/core in both repositories accepts optional map fields and finite signed coordinate values.

Backend: `src/venue-map/models.js`, `routes.js`, route registration in `src/server.js`, `src/venue-map/migrate.js`, `scripts/venue-map-migrate.js`, `test/venue-map.integration.test.js`, and the questionnaire test now excludes hidden metadata.

See `docs/venue-map-verification/README.md` for exact verification and limitations. Deployment and live-provider verification are recorded separately in the verification folder. No Android installation is involved.

Vite-specific integration: MapLibre 6 ships a separate worker. `VenueMapCanvas.jsx` uses the documented `?worker&url` import and calls `setWorkerUrl` before creating a map. Keep this import: merely importing the main package can build successfully while clustering/GeoJSON fail at runtime. A deployment CSP must allow the emitted same-origin worker, map provider HTTPS requests, glyphs and the application's existing assets.

Layout follow-up: `.avail-venue` now contains the map component itself, retaining `.avail-venue-head` and omitting `.vm-toolbar`. Search, filters, results and the admin form stay in the left sidebar; the geographic canvas fills the right side without panel padding. The separate review column retains the date and Continue planning action. Below 760px, controls and map stack with no horizontal overflow. The former guest/address inputs in this panel were replaced as requested; booking details remain in the existing questionnaire.

Flexible search: the server tries Geoapify named Places first (up to 30 candidates, 10 returned), then a bounded partial-name retry, then address/city geocoding when no business is found. Articles, possessive apostrophes, case and accents are normalized for upstream names; saved directory search accepts partial words in any order and optional apostrophes. Up to three sequential provider calls share one 8-second deadline and one user search quota slot. Results retain provenance and unknown capacities. External results remain listed when outside the current viewport, and a completed search fits the map to returned locations. Provider coverage can still omit businesses; results are never invented.
