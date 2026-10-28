# Homepage music archive / VP2

Reference: https://pin.it/3fzx4Oo1w — K-Radio HMI Design / Player by Sun Danyang (TUYI). Visual reference inspected from the pin's preview image: https://i.pinimg.com/736x/80/b9/26/80b926f38e1d0f94a790ba726e9f1c7d.jpg

The second homepage viewport sits immediately below the hero, followed by Setup (03) and Live (04). Its black listening stage uses a central square sleeve with two covers receding in depth, a curved playback line, centered track/artist information, and transport controls. Surrounding homepage background remains continuous with VP1.

## Recordings and playback

- Uses published archive recordings, covers and album metadata. No invented tracks or lyrics.
- The current deployment has one published recording. Decorative unlabelled record sleeves preserve the composition without creating fake recordings. Real neighboring recordings replace these sleeves when available.
- Artwork falls back to the existing DJ Khalil blue portrait when no track or album cover is published.
- Uses the existing ArchiveFooter audio element, equalizer and channel graph. VP2 never creates a second audio element or graph.
- Play/pause, progress seeking and volume communicate with the shared player; the state bridge also reflects changes made in the sidebar.
- VP2 starts playback without waiting for the offscreen hero headphone animation. The existing vinyl player retains its normal admission behavior.
- Archive requests use `/music-archive` when deployed and fall back only on HTTP 404 to the existing public `/bootstrap` archive. Published audio records are selected by ID before playback. This compatibility also fixes the public archive page on the older deployment.
- Search and category selection filter real recordings; the track-list drawer supports keyboard closing and returns focus to its opener.
- Reduced-motion preferences disable cover transitions. English and Arabic layouts are supported.

Files: `src/echo/HomeMusicArchive.jsx`, `src/echo/homeMusicArchive.css`, `src/lib/musicArchiveCatalog.js`, `src/lib/archivePlayerBridge.js`. Shared playback integration: `src/components/ArchiveFooter.jsx`.
