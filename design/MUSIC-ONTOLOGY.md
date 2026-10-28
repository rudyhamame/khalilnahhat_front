# Music ontology implementation

The architecture audit, entity relationships, schemas, API contract, migration mapping and rollback instructions are in the backend repository:

`../khalil-back/docs/MUSIC-ONTOLOGY.md`

Frontend entry points:

- Admin Music Archive: `src/echo/MusicArchiveAdmin.jsx` → `OntologyArchiveAdmin.jsx`.
- VP2: `src/echo/HomeMusicArchive.jsx` → `OntologyPlayerBrowser.jsx`.
- Shared progressive detail: `src/echo/RecordingExplorer.jsx`.
- Shared controlled filters: `src/echo/OntologyFilters.jsx`.
- Canonical contract: `src/lib/contracts/music-ontology.json` and `music-ontology.d.ts`.
- Persistent playback owner: existing `src/components/ArchiveFooter.jsx`.

The existing player, audio loading, equalizer, stems, lighting and archive file delivery are retained. Canonical browsing requests are independent of the audio queue. Lightweight playback/range delivery does not hydrate work metadata; both projections use the same persisted recording IDs. Selecting a metadata item or changing a filter does not play it or restart the current track. Queue controls preserve the current recording.

Public fallback remains available when an older API does not return `ontologyVersion`. The new admin editor requires the new backend API. Existing category/album management remains accessible. After backend deployment, recording creation/edit actions in those collection tools open the canonical editor.

Admin saves announce `echo:music-archive-changed`; the catalog invalidates its cache. Focus and periodic revalidation propagate changes between tabs. A previously successful metadata result remains visible during a temporary refresh failure.

Checks and screenshots: `artifacts/music-ontology-20261028`. Browser checks use an isolated disposable MongoDB replica set and generated WAV, not live data. Run `npm run test:music-ontology`, `npm run build`, and `node scripts/verify-music-ontology.cjs` from this repository. The backend has its own `npm run test:music-ontology` command.

Deployment and migration have not been performed. MongoDB transactions (replica set/Atlas) are required for canonical writes. Existing recordings remain explicitly unmapped until an administrator reviews their production type, primary work and credit roles. No classification is inferred from a legacy category or artist string.
