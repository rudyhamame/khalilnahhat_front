# Live Studio targeted refactor — 16 November 2026

Admin audit: `/admin/echo?tab=service-overview-operations-guide&guide=live-studio-audit`.
The existing Live Stream guide links to this audit. Six structured sections cover module ownership, recording progress fixes, capture/recovery boundaries, remaining findings and verification limits.

## Changes

- Extracted completion-scheduled progress polling and recording selection into `studioRecordingMonitor.js`, bound by `useStudioRecordingMonitor` to studio enabled state, token and recording id.
- Folder reads no longer overlap, failures become a retryable UI hint, changed-folder results are discarded, cleanup ignores late responses and aborts network reads.
- Server progress stops at ready/partial and cannot reuse another account/recording's status. Missing records and transient network failures retry.
- History comparison includes all session metadata. Existing disk recovery, upload, capture, go-live fallback and archive permissions remain in their existing modules.
- Extracted workspace measurement/fullscreen cleanup into `useStudioWorkspaceLayout`; extracted the session-scoped timer into `LiveElapsedTimer`. Removed unused imports and an unused retry setter/state from AdminLiveStudio.

## Automated verification

Broad regression command (120 passed, zero failed):

```sh
node --test src/lib/studioRecordingMonitor.test.js src/echo/docs/liveStudioAuditGuide.test.js src/echo/docs/liveStreamGuide.test.js src/hooks/useWebrtcBroadcast.test.cjs src/lib/studioRecordingFallback.test.js src/lib/recordingOutputs.test.js src/lib/directRecording.test.js src/lib/diskRecordingStore.test.js src/lib/localLiveRecording.test.js src/lib/studioAudioMixer.test.js src/lib/liveDestinationSources.test.js
```

After import cleanup and adding a signed-in administrator route check, the focused command passed 12 checks (zero failed):

```sh
node --test src/echo/docs/liveStudioAuditGuide.test.js src/echo/docs/liveStreamGuide.test.js src/lib/studioRecordingMonitor.test.js
```

The new checks execute the poll driver with deterministic pending reads and timers; cover cancellation, errors/recovery, terminal status and latest-recording selection. Server rendering verifies offline studio controls, audit selection, all section anchors, administrator route rendering and non-admin gating. These are source-level checks, not browser interaction tests.

Targeted oxlint reported no warnings or errors for the refactored component, new hooks/modules/tests, audit and guide renderer. `git diff --check` passed. Final production build passed with the existing chunk-size advisory:

```sh
npm run build -- --outDir /tmp/live-studio-refactor-build
```

## Limits and remaining findings

No physical camera/microphone capture, folder permission interaction, broadcast, destructive disk operation, publication or deployment was performed. Countdown cancellation, authoritative elapsed time and further decomposition of recording actions/screen orchestration remain open and are explicitly listed in the admin audit. Existing broader Live Stream documentation was linked to the new addendum; its historical device/deployment claims were not re-certified.
