# Echo Docs / Live Stream — implementation and content review

Reviewed 1 November 2026. Frontend source observed at `af4b9bc`; backend at `a2fb4d7`. These identify source review, not a deployed service release. No unified streaming service version is declared; none is invented in the guide. Android's reviewed version 0.4.1 / code 15 is taken from its actual Gradle metadata.

## Delivered area

Echo Docs → Service Overview & Operations Guide → Live Stream.
Route: `/admin/echo?tab=service-overview-operations-guide&guide=live-stream`.

- Content: `src/echo/docs/liveStreamGuide.js` (structured blocks, sections, links, review metadata).
- Rendering/accessibility: `src/echo/ServiceOperationsGuide.jsx` and `serviceOperationsGuide.css`.
- Existing navigation: `src/components/AdminWorkspace.jsx`.
- Existing authorization/route selection: `src/echo/EchoAdmin.jsx`, reached through `src/echo/routes.jsx` and the App account bootstrap. No new data endpoint or credential surface is added. Static documentation is non-secret and is part of the frontend bundle; the admin UI requires a verified administrator session.
- Validation: `src/echo/docs/liveStreamGuide.test.js`, included in `npm test`.

The guide contains the ten requested sections, three media paths, source-specific first-stream steps, a manual verification checklist, troubleshooting, configuration responsibilities and expandable technical detail. It inherits the existing dashboard theme and keeps documentation separate from runtime status. The guide makes no provider-health request and no account-billing request.

## Content evidence

Paths below are relative to their repositories. Reviewed implementation takes precedence over historical deployment prose when they differ.

| Subject | Source inspected |
|---|---|
| Camera claims, readiness, stop, sixty-second preparation timer, signed webhooks | Backend `src/live-broadcast.js`, `test/live-broadcast.test.js` |
| LiveKit OBS RTMP ingest / transcoding; two-minute preparation; serialized ten-second reconciliation; revocation retries | Backend `src/obs-broadcast.js`, `test/obs-broadcast.test.js` |
| Configured relay selection, WHIP/WHEP, private connection handling, disk limits and recordings | Backend `src/obs-relay-broadcast.js`, `src/obs-relay-client.js`, `deploy/obs-relay/controller.cjs`, `live-access.cjs`, `compose.yml`; frontend `ObsBroadcast.jsx` |
| Required sign-in; subscriber-only credentials; room-bound relay access | Backend `src/live-access.js`, `src/server.js`, `test/live-access.test.js`, `test/live-studio.integration.test.js`; frontend `WebrtcViewer.jsx`, `HomeLiveConsole.jsx` |
| Audience ownership, quotas, review/recovery, hiding/restoring comments | Backend `src/live-interactions.js`, `live-rate-limit.js`, `live-suggestions.js`, `live-comments.js`, `live-requests.js`; integration tests; frontend `AdminLiveAudience.jsx`, `LiveSongRequest.jsx` |
| Private recording staging, transfer, multipart limits, retry, publication and reversible list removal | Backend `src/live-recordings.js`, `recording-storage.js`, `recording-files.js`, `obs-relay-recordings.js`, `test/live-recordings.test.js`; frontend `LiveArchiveAdmin.jsx` |
| UI controls, purpose labels, microphone processing and playback listening controls | Frontend `AdminLiveStudio.jsx`, `ObsBroadcast.jsx`, `MicLevelMeter.jsx`, `VocalCorrectionControl.jsx`, `useWebrtcBroadcast.js`, `useLiveStatus.js`, `lib/liveGoals.js`, `HomeLiveConsole.jsx` |
| AI supported controls, approval and independent verification | Backend `src/ai-admin/live-tools.js`, registry/engine and integration tests; Android `AiAdministratorActivity.kt`, `LiveAdminPolicy.kt` |
| Android preview/capture, room monitoring, inputs and platform metadata | Android `app/build.gradle`, manifest, `BroadcastService.kt`, `StudioActivity.kt`, `EchoApi.kt`; LiveStudio API/policy/UI tests |
| Optional live-start email announcements | Backend `src/live-start-emails.js`, `src/brevo.js`, notification rules |
| Hosting/dependencies, environment names and deployment boundaries | Backend `.env.example`, `package.json`, `Dockerfile`, relay Compose, `docs/RENDER-DEPLOYMENT.md`, `OBS-SETUP.md`, `LIVE-STUDIO-REFACTOR.md`; frontend package metadata; Android README |

Provider cost references are official LiveKit quota documentation, Render free-service limits, Cloudinary billing documentation and Backblaze billing guidance, linked next to the requirements tables. No fixed prices, paid plan ownership, current quota balance or free-service guarantee is asserted. Private deployment values and credentials are not copied into this guide. Legacy example booking/management addresses are not presented as technical support contacts.

## Validation performed

- `npm test`: 62 tests passed, including two guide content/navigation checks.
- `npm run lint`: no errors; existing repository warnings remain.
- `npm run build`: passed; existing large-bundle warning remains.
- `git diff --check`: passed.
- Actual existing account flow in an isolated local API/Mongo database: signed-out navigation required sign-in; a signed-in non-admin received “Admin sign-in required” and no guide DOM; the administrator could see the guide.
- Browser: new top-level Echo Docs navigation and nested Live Stream tab; Live studio and Live Recordings links; return navigation; all ten local section anchors resolved; architecture technical disclosure opened; three diagram rows rendered. Other internal destinations were checked against the existing dashboard tab/route map.
- Desktop visual inspection and screenshots; phone checks at 390×844 and 320×568 showed no document horizontal overflow. The 600px-wide troubleshooting table scrolls inside its 368px container at 390px viewport. Section anchors stay visible below workspace chrome. Temporary viewport overrides were reset.
- Screenshots `desktop.jpg` and `mobile.jpg` use disposable test accounts and synthetic/empty local data. No real stream, media capture, publication, email or paid provider action was performed.

## Still requiring confirmation

Coordinated production rollout and service health; actual provider plans/quotas/bills; physical device/browser/network acceptance; end-to-end recording and transfer; live announcement/push delivery; owner backup/restore and retention policy; a dedicated support contact and response agreement. The existing single-session login limitation and lack of a durable camera-preparation sweep after API restart are explicitly documented.

For future edits, inspect the relevant implementation and tests before updating structured copy. Update `reviewedOn` only after a real review; do not substitute build time or imply that a source review is a deployment health check.
