# Live source and receiver investigation — 2026-11-01

User observed OBS preview/audio stuttering before delivery and confirmed muting OBS global audio removed overlapping/looping audio. The initial diagnostic phase did not change OBS settings or stop the stream. The user subsequently explicitly approved stopping the test and restarting OBS with lower-load settings; see the applied configuration below. An additional diagnostic viewer was closed after sampling to remove its decode load.

## Observed source

The active API configuration reported OBS/WHEP. Local active OBS log/profile show a 1920×1080 canvas, 1280×720 at 30 fps output, x264 veryfast Baseline at 4000 Kbps, stereo Opus at 160 Kbps and 48 kHz audio. The scene uses a visible YouTube Browser source at 1920×1080 with rerouted audio. Desktop Audio and Mic/Aux were also enabled in the saved scene before the user's mute change. This combination permits return-preview feedback/duplicate capture; the user's mute result supports that diagnosis but is not a controlled source isolation test.

The laptop reports four CPUs. At 22:58 Eastern load averages were 21.04/15.83/11.16; CPU pressure `some avg10` was 68.45%. Available memory was about 4.2 GiB and memory pressure avg10 was zero. OBS and its Browser processes were substantial CPU consumers. These observations support source contention; they do not identify every CPU consumer or prove encoding is the sole cause. Current OBS log records audio buffering increasing from 42 to 128 ms. Current-session total render/encoding lag was not available without stopping the stream or enabling additional OBS control, neither of which was done.

## Receiver evidence

Sanitized inbound RTP stats collected from the extra Chrome laptop viewer showed H.264/Opus. One five-second interval increased video decoded frames 624→714, dropped frames 21→85 and freeze count 2→8 while video packetsLost stayed zero. Audio timing adjustments were present. A fresh viewer also accumulated freezes and dropped frames. This is not evidence that iPad networking is loss-free. It does not independently prove audible pitch changes arise in the viewer; source audio also stutters according to the user.

Temporary development-only React/frame/receiver profiling was removed after sampling. No credentials, stream keys, SDP or network addresses were logged into this report.

## Player correction

WHEP reconnects now remove/stop stale tracks and keep exactly one current track per kind, preserve the shared audio/video timeline instead of repeatedly assigning the same srcObject, and reject tracks arriving after cleanup. LiveKit subscriptions detach a replaced track of the same kind, ignore repeated subscription events and ignore unsubscribe events for a previously replaced track. These changes address player lifecycle defects independently of OBS source overload; they cannot repair media already damaged at the source.

Regression tests exercise 100 audio replacements, duplicate arrival, video preservation, cleanup and ended late-track rejection. Run `npm test`, `npm run lint`, and `npm run build`. Physical iPad retest and a new OBS session under lower source load remain necessary. Hardware encoder compatibility has not been verified; no encoder selection is presented as tested.

## Approved OBS test configuration applied

After explicit user approval, OBS was stopped using SIGTERM and finished its normal shutdown. A later `flatpak kill` found no running instance; no forced termination was performed. Its completed-session log can now be inspected for render/encoding lag. Clean, private configuration backups are under the OBS configuration directory’s `echo-test-backups/20261101-230435-clean` directory (mode 0700, files 0600); backups include credentials and must remain private.

The active Flatpak profile `Untitled` was changed from a 1920×1080 canvas to 1280×720, keeping 1280×720 output and 30 fps. The single Browser source resolution was changed from 1920×1080 to 1280×720, preserving its URL, audio routing and scene transforms. x264 preset was changed from veryfast to ultrafast and video bitrate from 4000 to 2500 Kbps. Audio settings, muted states, stream credentials and other sources were retained. OBS was reopened without automatically starting another live stream. This is a diagnostic configuration to reduce composition/encoding/upload load, not a verified quality or reliability guarantee. Ultrafast sacrifices compression efficiency; image quality needs review at the lower bitrate.

The receiver's pending play promises now also reject stale generations after retry. Actual component-effect tests cover retry cleanup, old play completion/rejection, one srcObject assignment, late events after disposal, repeated LiveKit subscriptions and stale unsubscribe events. Temporary diagnostic instrumentation was removed.

### Final checks

The completed OBS log reports 773 rendering-lag frames (2.6%) and 1790/29258 skipped encoding frames (6.1%). Reopened OBS log confirms both canvas and output at 1280×720/30. Semantic scene comparison against the clean backup confirms all settings other than the two Browser dimensions were preserved, including audio mute/routing. Profile comparison confirms only the four intended field changes plus OBS's own persisted `Stream1.EnableMultitrackVideo` field (written on launch); stream secret values were not printed.

All 75 configured frontend tests pass. Both new component-effect regressions fail against the prior committed viewer (duplicate srcObject assignment and duplicate LiveKit attachment respectively) and pass against the corrected implementation. Lint exits zero with existing warnings; production build passes with its existing chunk-size warning; git diff whitespace check passes. Browser automation became unavailable during this continuation, so no screenshot or physical iPad verification is claimed. OBS was reopened through its installed Flatpak application and its new log verifies loaded canvas/output settings. A fresh live stream and listening test remain pending.

## Fresh test after OBS changes — approximately 23:11 Eastern

The API reports an active OBS/WHEP stream. Current OBS log confirms x264 ultrafast, Baseline, 2500 Kbps and 1280×720/30. User reports that audio interruptions/pitch changes remain. The saved OBS scene confirms Desktop Audio and Mic/Aux muted at volume zero, Browser audio unmuted/rerouted, and no browser-source audio filter (only a sharpness video filter).

A bounded development-only receiver probe sampled the user's existing muted dashboard preview; no extra receiver was opened. Only the preview was reconnected, leaving the source on air. The probe was removed afterward.

Over the 20-second interval between first and third samples: video decoded frames increased 79→675, dropped frames stayed at four startup drops, freeze count stayed zero, and final reported frame rate was 30. Audio packets received increased 243→1242, lost packets 0→2, concealed samples 1206→1604, samples removed for acceleration 0→4523 and inserted samples stayed 242. Final audio jitter was 6 ms. These metrics confirm improved video in this sample, not universally smooth playback or repaired audio. Sparse receiver loss/concealment and timing adjustments do not isolate source-side artifacts, relay/upstream loss, downstream loss or local playout as the cause of the user's audible pitch changes.

A five-second local CPU sample showed combined OBS processes at 115.2% (100% is one CPU core). Four cores are available. No controlled before/after CPU benchmark is claimed. Direct read-only relay inspection using the existing SSH key was rejected (`Permission denied (publickey)`); no remote configuration or service was changed. Source-versus-viewer audio isolation and physical iPad QA remain open.

Additional audio regression: disabled browser vocal correction has no connected worklet input; repeated enable calls do not duplicate it, disable disconnects it once and processor failure restores dry audio. The full configured frontend suite now passes 76 tests. This verifies the browser microphone path only; OBS does not pass through that processor.
