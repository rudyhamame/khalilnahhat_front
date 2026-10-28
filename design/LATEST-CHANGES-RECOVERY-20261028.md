# Latest changes recovered — 2026-10-28

The merge `ef9b68f` replaced 17 source files from the local pre-merge commit `5d1e080` with the other branch versions. The recovery restores all 17 files, including the changes from `3c71743` and the event-type column added in `5d1e080`.

## Recovered

- Seasonal theme admin tab, preview, homepage memory tree and its existing player/inspector integration.
- Homepage portrait entrance/scroll animations, viewport transitions and About section integration.
- Setup entrance/exit animation, simulation flip, equipment quantity grid, event-type column and model-part controls.
- Venue intelligence API context, equipment synchronization and embedded draft review.
- AI streaming replies, voice context/usage handling, policy refresh and setup navigation.
- Artwork crop/pan dialog and picker-cancel fix.
- Catalog admin panel, Cloudinary asset references, quotation layout and latest draft/AI panel styling.

All other files from the existing merge remain in place, including the address dropdown and venue research fixes. The sitemap additions and equipment admin route/navigation from the other branch are retained. The backend repository was already clean with a linear history and was not changed.

## Recovery points

- Pre-recovery merge: `ef9b68f`
- Backup branch: `recovery/before-latest-changes-20261028`
- Restored source: `5d1e080`
- Local running frontend: http://localhost:5176
- Seasonal admin: http://localhost:5176/admin/echo?tab=seasonal-theme

## Checks

- Production build succeeded; Vite reports the existing large-chunk warning.
- Lint completed with warnings and no errors.
- No behavioral tests were run.
- No push or public deployment was performed.
