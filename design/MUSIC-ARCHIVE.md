# Music Archive — local implementation

The supplied DJ Khalil Music Archive brief is implemented in the existing Echo application. No demo collection is inserted in the real database and no production deployment is performed.

## Entry points

- Admin: `/admin/archive` (normalizes to `/admin/echo?tab=music-archive`).
- Public library: `/music-archive`; `/mixes` remains an alias.
- Collection pages: `/music-archive/collections/:id`.
- Existing curated website playlist: `/admin/echo?tab=player-playlist`.

Khalil hand-builds every set of recordings in the admin **Collection Builder** (Music Archive → Collections): pick recordings, order them, add a cover, then publish. A recording can sit in many collections. There are no albums or categories. New collections start as drafts.

Collection and song cards use the existing Echo palette. Public controls include search across title/artist/collection and curated/date/alphabetical ordering. Collection playback sends a validated ID queue to the existing persistent player.

## Storage and authorization

All management and upload endpoints require the existing administrator authentication. When Cloudinary credentials are configured, new cover/audio uploads use authenticated storage and signed playback/preview URLs. Without those credentials, uploads are stored privately under backend `data/music-archive/`, with file metadata in MongoDB. Set `MUSIC_ARCHIVE_STORAGE_DIR` for a durable volume and optionally `MUSIC_ARCHIVE_PREVIEW_SECRET` for a stable signing secret. Back up that directory together with MongoDB. Local draft previews expire after one hour; public file requests recheck publishing and support byte ranges for seeking. Hiding a local song or parent withdraws public access to that file.

Public listing endpoints omit drafts and entries under hidden parents. Existing publicly uploaded Cloudinary media retains its original delivery type; previously shared direct URLs cannot be recalled by hiding an archive entry. Cloudinary signed delivery links also remain bearer links once shared; those publishing controls restrict discovery rather than applying expiring playback entitlements.

Audio limit: 100 MB. Cover limit: 10 MB. Allowed covers: JPG/PNG/WebP; the editor optimizes covers to a maximum 1600px WebP where supported, and Cloudinary also applies image optimization. Audio supports MP3/WAV/M4A/Ogg/AAC/FLAC/WebM. Only upload material the administrator has rights to publish. Audio replacement changes the record without erasing the prior stored upload.

## Local review

The normal development service currently points at the shared remote API, so frontend-only reloads cannot install the new backend routes there. A separate local backend on `4312` and frontend on `5182` can review both changes together without changing that shared service:

```
# /home/rudy/projects/khalil-back
PORT=4312 MONGODB_URI=mongodb://127.0.0.1:27018 node src/server.js
# /home/rudy/projects/khalil-front
VITE_BACKEND_PROXY_TARGET=http://127.0.0.1:4312 npm run dev -- --host 127.0.0.1 --port 5182 --strictPort
```

Public: `http://127.0.0.1:5182/music-archive`; admin: `http://127.0.0.1:5182/admin/archive`. This uses the local database, not the remote archive. Shipping requires deploying the backend and frontend together through the existing deployment workflow.

## Verification

- `npm test`, `npm run lint`, `npm run build` in frontend.
- `node --test test/music-archive.test.js test/music-archive-files.test.js test/archive-player.test.js test/archive-create.test.js` in backend.
- HTTP handler tests use in-memory models and a mocked Cloudinary uploader; no real customer/account/payment/email/upload operations are performed.
- `test/helpers/archive-preview.js` in backend provides a loopback-only in-memory catalog for visual QA. Its fake token is accepted only by that explicitly started test server. Never expose it or use it as the application server. Test records disappear when it stops.
