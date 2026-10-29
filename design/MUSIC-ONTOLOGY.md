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


## Classification update (2026-10-28)

Display Lyrical Music (Melody + Lyrics) for stored SONG and Instrumental Music (Melody only) for stored MUSIC. Keep stored identities for compatibility.

The recording editor chooses Individual → Cover / Remix / Production / Mashup, or Multiple → Medley / Mix / Live. Components are linked reusable musical works, supporting both lyrical and instrumental works within a recording. Primary work remains available for older clients; additional component works are independently linked and distinct from source/provenance references. The selected recording table and public explorer show each component with its own metadata. Filters search the components and include recording amount.

Requires contract version 2 API deployment before using new writes; no live data migration is required.

## Recordings table columns (2026-10-28)

The selected recording uses three grouped headers in this order:
- Recording: Name, Duration, Release Date, Content (Name and Type), Work, Genre.
- Lyrical: Language, Dialect, Artist(s), Lyrics Concept.
- Instrumental: BPM, Key, Musician(s), Instrument(s).

Each content work has one row. Recording-level cells span those rows. The Work column displays the recording production classification (Medley, Mix, Remix, etc.). Genre displays Mix with the actual genres when more than one distinct genre is present. Lyrical cells are empty for instrumental-only content; melody fields apply to either content type. Missing metadata displays an em dash, without guessing values. A content name opens a read-only right aside with that work's information and a separate Edit content metadata action. Narrow main panels scroll horizontally and retain the grouped table headers.
