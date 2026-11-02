# Recording playback investigation — November 1, 2026

Local source and browser checks only. No deployment or provider settings were changed. User tabs were preserved; the dedicated playback tab was paused and closed. Concurrent user edits were retained.

## Confirmed avoidable work

- `ArchiveFooter` activated `useStemPlayer` as soon as a playlist was enabled. Ordinary listening could therefore start a server separation request, poll every four seconds and load all four separated tracks while the Mixer was hidden.
- `useStemPlayer` fetched/decoded four full recordings concurrently. Four 180-second stereo Float32 buffers at 44.1 kHz require 254,016,000 bytes (242.25 MiB) before compressed downloads, the original audio and graphics. The previous code had no full-track memory budget or fetch cancellation when leaving the mixer.
- Stem meters called React state updates approximately every 70 milliseconds, rendering the controller through `ArchiveFooter` even while hidden. SVG text fitting used a newly created ref callback on every render and performed text-length reads after attribute writes. `ArchiveFooter` also observed child-list mutations throughout the entire document merely to locate the mixer target.
- The archive retained its generic viewport-fitting text/resize observer despite CSS already preserving a natural-size archive layout.

## Changes

- Original recording playback stays independent of stem preparation. Channels prepare/load when Mixer is opened. Hidden Mixer controller DOM is unmounted, with explicit mount-state events replacing the document-wide mutation observer.
- Closing Mixer or switching tracks aborts pending channel fetches, invalidates stale decoding work, disconnects nodes, clears meter timers, releases retained buffers and restores the original audio path. A native decode already accepted by the browser cannot be synchronously canceled; its result is discarded and no further channel loads continue.
- Channels decode sequentially. The optional decoded-channel budget is 384 MiB, checked against duration/sample rate before download and actual decoded sizes afterwards. Over-budget recordings retain original playback and show a memory-limit message. This is a bound on retained stem PCM, not total tab RAM or an assurance against every browser allocation.
- Meters update both SVG ladders through DOM refs at 10 Hz, without React state changes. Text-fitting callbacks remain stable while their text/width is unchanged. Ready channel status stops polling; transient status failures have bounded retries.
- Beat analysis remains at its existing cadence; full-screen decorative lighting styles update at 10 Hz. The archive uses its authored natural layout without viewport-fit observers. Other fitted sections retain their existing behavior.
- A server separation job already accepted can continue to complete/cache after closing Mixer; this change does not cancel server inference or delete its outputs.

## Measurements and limits

Short Linux `/proc` renderer samples, measured on this development workstation with other tabs/apps open:

| Sample | CPU, one core = 100% | Renderer resident memory |
| --- | ---: | ---: |
| Before, playing/stalled test | 111.4% | 947.1 MiB |
| After initial hidden-work fix | 76.8% | 610.8 MiB |
| Later visible archive samples | 116–117% | 631–698 MiB |

These samples are not a controlled performance benchmark or a definitive browser-process trace. They do not establish a lasting CPU reduction. Disabling large lyrics, temporarily hiding lighting and temporarily stopping the vinyl animation did not materially lower the sampled CPU; those isolation overrides were removed. Broad full-page CPU load remains unresolved and needs an attributed browser performance trace. RAM savings vary with recording length, image caching, browser allocation and other content. Do not report all stalls or all CPU problems as fixed.

Before the changes, browser control calls timed out during playback. After the changes, the public recording advanced with readyState 4 and no media error, pause/resume controls responded, the hidden controller count was zero, opening Mixer mounted the controller and reached “Stems on,” and returning to the archive removed it again. This is a short observation, not long-duration/device-wide QA. Lyric display preference was restored after isolation checks.

## Validation

All 68 configured frontend tests pass, including five actual-hook regressions and one decoded-memory calculation regression added here. The hidden-playback regression fails against the previous hook (one unexpected status request) and passes after. Tests exercise cancellation during decode, one engine across track changes/reopening, no state updates during meter ticks, both ladders and oversized-track fallback. Existing tests continue to cover gain/solo/mute and synchronized source scheduling. Lint and production build pass with existing warnings. Changed files pass scoped whitespace checks.
