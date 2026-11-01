// Reviewed against the local implementation, not a deployment audit.
// Keep client copy here; internal evidence and review notes live in design/verification/echo-docs/.
const p = text => ({type:'paragraph',text});
const list = items => ({type:'list',items});
const steps = items => ({type:'steps',items});
const table = (headers,rows) => ({type:'table',headers,rows});
const detail = (title,items) => ({type:'details',title,blocks:items});
export const operationsGuideRoute='/admin/echo?tab=service-overview-operations-guide&guide=live-stream';
export const guideLinks={studio:'/admin/live-stream',recordings:'/admin/echo?tab=live-archive',ai:'/admin/echo?tab=ai-administrator',configuration:'/admin/echo?tab=ai-configuration',billing:'/admin/echo?tab=ai-billing',notifications:'/admin/echo?tab=notifications',audience:'/#live'};
export const liveStreamGuide={
 id:'live-stream', title:'Live Stream', reviewedOn:'2026-11-01',
 introduction:'Run a live DJ set, event broadcast, home-studio session or radio-style show through Echo. This guide describes the reviewed source code. It does not certify that a deployed service is configured or healthy.',
 sections:[
 {id:'overview',title:'Service overview',blocks:[
  p('One active broadcast connects a browser camera, the Echo DJ Android camera, or OBS Studio to signed-in viewers on the Echo website. The live room combines video or audio, a planned set list, song requests and audience comments. An administrator controls the source and moderates engagement.'),
  p('Choose a source, prepare or start its connection, publish camera or microphone media, and check the audience player. The service opens the room only after media is confirmed. During the show, review requests and comments. End the source when finished, then check any saved recording before deciding whether to publish it.'),
  {type:'links',items:[['Open Live studio',guideLinks.studio],['Open audience view',guideLinks.audience],['Open Live Recordings',guideLinks.recordings]]},
 ]},
 {id:'features',title:'Features and capabilities',blocks:[
  table(['Feature','Use it / where','Limits'],[
   ['Browser camera and microphone','Live → Live stream → This browser. Select input devices and choose Go Live From Browser. The preview, microphone meter and optional Vocal tune help check your signal.','Requires capture permission and a secure browser context. Audio-only or video-only is allowed if one device succeeds. No screen-sharing control is implemented.'],
   ['Android broadcaster','Use the Echo DJ administrator app’s Live studio. Start a private camera preview, then go live; camera switching, microphone mute and capture quality controls are available.','Private preview is not on air. The app is administrator-only; it is not the audience player. The reviewed Android build is 0.4.1 (version code 15); use the matching updated client.'],
   ['OBS production','Choose OBS Studio, set Save recording before connection, then Prepare OBS. OBS supplies scenes, sources and its audio mix.','One connection at a time. Replace the key for every broadcast. An OBS connection can block a camera start even while waiting for media.'],
   ['Title, purpose and preview','In Live studio, save Broadcast title and select LIVE STREAM GOAL. Use preview orientation, fullscreen, preview sound, Refresh or Reconnect preview.','Purpose labels describe the show; they do not schedule a start or change transport. Preview orientation does not rotate the broadcast itself. Admin preview starts muted.'],
   ['Audience playback and listening controls','Website Live section: sign in, enable sound, adjust volume/equalizer, pause or resume the local preview, or reconnect. Planned songs are shown beside the player.','Listening controls affect that viewer only. Pausing preview does not stop the source. Browser autoplay or fullscreen restrictions may require a tap.'],
   ['Song requests','Signed-in viewers can search YouTube, enter a song/artist or submit an HTTPS song link and note. They receive a confirmation code and can see their recent current-room request statuses.','A link is a request, not a licensed music-streaming integration. YouTube search needs server configuration. Requesting a track does not guarantee it will play. No payment is required by this request flow.'],
   ['Request review','Audience requests in Live studio: switch Needs review / All requests, open a source link, APPROVE into the music queue, REJECT, or recover an interrupted review.','Current session only. Recovery is allowed after a review has been interrupted for at least two minutes. Duplicate approvals reuse the existing queue entry; approval does not play audio automatically.'],
   ['Comments and moderation','Audience comments in Live studio: Hide comment or Restore comment. Hidden comments remain visible to administrators for review.','Viewers must sign in. Comments belong to the current room, not a permanent public chat. No automated comment moderation, individual viewer ban or audience-management roster is provided here.'],
   ['Saved recordings','Live → Live Recordings: inspect status, select a part, preview, download, queue recovery, publish, remove from the list and undo removal.','Ready media is required for preview/download/publication. Publishing makes videos public and adds their audio to the music archive. Removing a list entry does not unpublish existing website items or erase media.'],
   ['Echo AI Administrator','Open ECHO AI → Echo AI Administrator, or the Android AI entry. Ask for status, title/purpose changes, OBS preparation/end, next OBS recording preference, request review/recovery, or comment hide/restore.','Reads and approved writes use the same server controls as the manual studio. AI cannot start camera capture, operate OBS on your computer, promise task success or bypass approvals. Android Live controls create drafts; review and send them yourself.'],
   ['Live-start announcements','Website → Notifications controls the live-started email rule. When enabled and email delivery is configured, on-air transitions queue announcements for eligible registered users.','Delivery depends on the email provider, settings and the broadcast still being current. No delivery or audience-attendance guarantee. Android AI task notifications are separate from live-start emails.'],
  ]),
  {type:'links',items:[['Live studio',guideLinks.studio],['Live Recordings',guideLinks.recordings],['Echo AI Administrator',guideLinks.ai],['Notification settings',guideLinks.notifications]]},
  detail('Technical detail: engagement bounds and microphone processing',[
   p('The current audience comment feed returns up to 20 visible comments; administrators can read up to 100 including hidden comments. The studio request feed is bounded to 200 and a member’s request-status list to 20. Comments are 1–280 characters. Comments and song requests each have a five-per-minute, per-account allowance held in process memory; this is not a distributed anti-abuse system.'),
   p('Browser Vocal tune has key, scale, correction amount and retune-speed controls. It processes a solo microphone signal using a browser audio worklet. If unsupported, the broadcast falls back to the natural microphone signal with a message. It can add delay or alter timbre; it is not an OBS or native Android effect. Headphone monitoring and other Echo audio can compete for audio focus.'),
  ]),
 ]},
 {id:'architecture',title:'How streaming works',blocks:[
  p('The Echo API handles sign-in, broadcast ownership, status and audience actions. Media travels through the configured media service. Viewers obtain authenticated, room-specific playback access; copying a public status address is not enough to watch.'),
  {type:'diagram',label:'Live source and recording paths',paths:[
   ['Browser / Android camera','LiveKit room','Signed-in website viewer'],
   ['OBS · configured relay','WHIP → MediaMTX / WebRTC','Signed-in website viewer · WHEP'],
   ['OBS · LiveKit alternative','RTMP ingress → LiveKit room','Signed-in website viewer'],
  ],caption:'Echo API authorizes and coordinates each path. Only one source can own the live broadcast at a time.'},
  p('For camera and LiveKit OBS recording, LiveKit writes to private S3-compatible staging, then the backend transfers confirmed files to private Cloudinary storage. For relay OBS recording, media is first recorded on relay disk, then transferred to Cloudinary. Large files may be split into parts. Live Recordings manages the result; publishing is a separate, explicit action.'),
  detail('Technical detail: processing and delivery',[
   p('The relay path uses WHIP ingest and WHEP playback through MediaMTX, with Caddy for HTTPS and coturn for network traversal. It passes live media through without remuxing or transcoding. Its documented OBS settings are H.264 Baseline, no B-frames and Opus audio. The alternative LiveKit OBS route creates RTMP ingress with transcoding enabled. Camera clients use LiveKit WebRTC SDKs.'),
   p('Recording preparation for LiveKit uses 720p/30 encoding settings. FFmpeg/ffprobe run in the backend image for recording inspection and splitting, not as a universal live transcoding fallback. The per-part archive target is 100 MiB. Actual output quality, delay and compatibility must be checked on the chosen devices.'),
  ]),
 ]},
 {id:'requirements',title:'Requirements and dependencies',blocks:[
  p('Client configuration required: ask the deployment administrator to confirm the items for your chosen source. This list is not a completed setup checklist. Account plans, spending limits and current bills are not exposed by this guide.'),
  table(['Required item','Purpose / who supplies it','Cost or constraint'],[
   ['Echo administrator account; viewer accounts','An administrator starts and manages broadcasts. Audience members sign in on the website to watch, comment and request songs.','Use existing account permissions. The current single-session login model may invalidate a phone when the same account signs in elsewhere.'],
   ['Deployed website, API and database','The existing Vite frontend, Node API and MongoDB hold settings, account sessions, requests, comments and recording metadata.','Hosting and database plans are the owner’s responsibility. A sleeping or stopped API cannot continuously run status/recording workers. No paid plan is automatically purchased.'],
   ['LiveKit project · camera or LiveKit OBS route','Server-held LiveKit URL/key/secret, accessible media service and signed webhook configuration support rooms, ingest and recording.','Plan quotas and media/ingress/egress usage apply. Exact account allowance and fees require provider-console confirmation.'],
   ['Recording storage · camera / recorded LiveKit OBS','Private S3-compatible staging bucket plus Cloudinary credentials and capacity. Deployment documentation describes Backblaze B2 staging.','Storage, delivery and processing can consume provider allowances or incur charges. Camera start prepares recording and fails if required storage is unavailable. OBS can be live-only when Save recording is off.'],
   ['A source device and input','For browser: a WebRTC-capable browser with camera or microphone. For Android: the Echo DJ app, Android 7/API 24 or later, camera and microphone permissions. For OBS: a computer with OBS and configured scene/audio sources.','Device, power, connectivity and any external equipment are supplied by the operator. Minimum Android API is a build target, not proof that every device works.'],
   ['Internet and secure access','Reachable HTTPS website/API, secure media access and a network that permits WebRTC; the relay may need its configured TURN path.','No measured universal bandwidth minimum or supported-browser/version matrix exists. Allow headroom above your encoded upload rate and test the actual venue network. A local HTTP LAN page may copy OBS keys but cannot be assumed to support browser capture.'],
  ]),
  table(['Optional / source-specific','Purpose and setup responsibility','Cost / limits'],[
   ['OBS relay server','Required only for relay OBS. Administrator provisions the Compose stack, HTTPS, media/TURN connectivity, private controller settings and recording disk. Cloudinary is needed when saving relay recordings.','Server, network traffic and disk capacity may have recurring costs. The guide does not confirm that a relay is deployed or reachable.'],
   ['OBS Studio / plugins','OBS is needed only for the OBS source. Use a build that exposes the dashboard’s required WHIP or Custom streaming settings. No Echo-specific OBS plugin is implemented or required.','Any third-party plugin or equipment integration is outside this implementation.'],
   ['YouTube Data API access','Server API key enables audience song search. Manual song names and links remain available without search.','Provider quota and any account charges must be checked by the owner. Spotify/Anghami links identify requests; no subscription playback integration is implemented.'],
   ['Echo AI provider and worker','Configure administrator AI in ECHO AI Configuration. Its backend credentials and task worker must be available. Android typed controls do not require microphone dictation.','AI provider usage, voice and optional task-notification setup are separate. See Echo AI billing; no AI subscription is bundled with streaming.'],
   ['Email provider; optional Android task notifications','Brevo sender configuration and the live-started rule enable live announcements. Firebase configuration supports separate Android AI task notifications.','Provider allowances, sender approval and device notification permission apply. Neither is required for manual streaming.'],
   ['External camera, audio interface, mixer/controller, headphones, stand and lights','Add to your chosen source as needed. OBS captures its configured sources; a phone can use its built-in camera/microphone. Headphones help prevent feedback.','No specific external model, capture card, driver or cable compatibility has been certified. A DJ controller is not automatically connected to Echo by this code.'],
  ]),
  {type:'links',items:[['AI configuration',guideLinks.configuration],['AI billing',guideLinks.billing],['LiveKit quotas and usage','https://docs.livekit.io/deploy/admin/quotas-and-limits/'],['Render free-service limits','https://render.com/docs/free'],['Cloudinary billing','https://cloudinary.com/documentation/billing_and_plans'],['Backblaze billing guidance','https://help.backblaze.com/hc/en-us/articles/360037814594-B2-Pricing']]},
  detail('Administrator configuration names — values must stay private',[
   p('Set website/API origins and MongoDB access in the deployment environment. For LiveKit paths, configure LIVEKIT_URL, LIVEKIT_API_KEY and LIVEKIT_API_SECRET, and route signed LiveKit webhooks to the backend webhook handler. Recording requires ECHO_RECORDING_PUBLIC_ENDPOINT, ECHO_RECORDING_STORAGE_ENDPOINT, ECHO_RECORDING_BUCKET, ECHO_RECORDING_REGION, ECHO_RECORDING_ACCESS_KEY, ECHO_RECORDING_SECRET and Cloudinary configuration. Create the private bucket first; the API does not create it.'),
   p('For the relay path, the API requires ECHO_OBS_RELAY_URL and ECHO_OBS_RELAY_TOKEN, matched to the private relay controller. Deploy the matching access helper with the controller. A configured relay is selected for OBS; this is not an automatic health-based failover to LiveKit. Never put credentials in VITE_* variables, guide content, screenshots or support messages.'),
  ]),
 ]},
 {id:'first-stream',title:'Setup and first stream',blocks:[
  steps([
   'Before an event, have the administrator confirm the matching frontend, backend, media/relay and Android versions are deployed. Confirm provider access, quotas, recording capacity, HTTPS and network connectivity. The reviewed refactor was built locally; its source review does not prove production rollout.',
   'Sign in as an administrator and open Live → Live stream. Refresh status. End any existing or waiting connection before choosing a different source. Set Broadcast title and LIVE STREAM GOAL.',
   'Browser: select This browser, choose Camera and Microphone, then Go Live From Browser. Grant the requested device permissions. Wait for confirmed on-air status. A connection attempt or local image alone is not confirmation that viewers can watch.',
   'Android alternative: sign into the administrator app, open Live studio, allow camera/microphone access and start the private preview. Wait for the camera preview to be ready, then go live. Keep the device powered and monitor the on-air indication.',
   'OBS alternative: choose OBS Studio and set Save recording before Prepare OBS. Open Connection details and copy the displayed Server plus the matching Bearer token or Stream key privately. Prepare immediately before the show and start OBS within two minutes.',
   'For relay OBS (Bearer token), use OBS Settings → Stream → WHIP. Follow the dashboard’s OBS Studio setup: x264, 2,500–4,000 Kbps, Opus, 1280×720 at 30 fps, and x264 options profile=baseline bframes=0 keyint=60. For LiveKit OBS (Stream key), use Settings → Stream → Custom with the provided server/key. Do not interchange the two connection types.',
   'Check the website Live section on a separate device signed in with a different viewer account. Tap Enable sound. Verify the actual picture/audio and a test request/comment using your own test account. Admin preview is muted by default. Avoid signing the same administrator account in again if the phone is broadcasting.',
   'Finish with End Browser Broadcast / End Android Broadcast, the phone’s end control, or OBS Stop Streaming followed by confirmation in the dashboard. Disconnect OBS revokes its connection. Wait for Offline / OBS disconnected; if stopping fails, refresh and retry the existing connection rather than preparing another.',
   'If recording was enabled or the source was a camera, open Live Recordings and wait for Ready. Preview and download a sample; use recovery only when a retained source exists. Publish only after reviewing the content and confirming you have permission to share it.',
  ]),
  {type:'checklist',title:'First-stream verification — manual checks, not detected setup',items:[
   'Deployment administrator confirms required services, credentials and spending/usage limits.',
   'Chosen source reaches confirmed on-air status; only one source is active.',
   'A separate signed-in viewer receives the expected picture and sound.',
   'A signed-out visitor receives the sign-in prompt and cannot play or engage.',
   'A test request appears, is reviewed once and has the expected status; hide/restore works for a test comment.',
   'Stopping the source closes the audience session and releases the connection.',
   'When recording is expected, a Ready file can be previewed/downloaded after transfer.',
  ]},
 ]},
 {id:'daily-operation',title:'Daily operation',blocks:[
  list([
   'Before each show: check the venue network, input levels, battery/power, current source ownership and recording preference. OBS needs a fresh prepared connection each time.',
   'While live: monitor the source and a separate viewer. Use audience request filters, APPROVE/REJECT and comment Hide/Restore. The UI refreshes activity automatically; Refresh is available when an update fails.',
   'Use the viewer’s listening controls for local sound changes. Use OBS, the browser microphone input/processing, or the Android microphone controls for the actual outgoing signal. These are different controls.',
   'If using Echo AI, ask it to read the current room first. Review the proposed target and approval before a write; check its verified result. Use the manual studio if AI is unavailable. Native command shortcuts only fill the composer.',
   'After the show: confirm Offline, inspect recording status and any transfer error, download important media and review before Publish. For multipart recordings, inspect every part. Removing a recording is reversible list removal, not a storage purge.',
   'Viewer management is limited: the Android broadcaster displays a participant count from its LiveKit room; this is not a cross-source attendance report. No browser audience roster, per-viewer kicking or analytics dashboard is implemented in this Live section.',
  ]),
 ]},
 {id:'reliability',title:'Reliability and recovery',blocks:[
  p('There is no uptime, uninterrupted recording or seamless-reconnect guarantee. The website, API, database, media service, source device, network and storage must all remain available. A healthy API process alone does not prove successful media playback or recording.'),
  table(['Mechanism','What is implemented','Evidence / limit'],[
   ['Source ownership and readiness','Atomic room claims and exact-room stop guards prevent competing or stale clients from replacing another broadcast. Camera readiness checks for published tracks before on-air status.','Covered by focused backend tests. Physical camera-to-viewer operation still requires deployment/device acceptance.'],
   ['Studio refresh','Status and audience feeds poll about every five seconds while enabled. Superseded responses cannot replace newer studio state. Refresh and preview reconnect are manual controls.','Code inspection; hook tests cover capture cleanup and stale lifecycle events. A poll is not continuous media monitoring.'],
   ['OBS reconciliation','Signed webhooks plus a serialized ten-second backend worker recheck OBS state. Waiting connections expire after two minutes; failed revocation retains the reservation for retry.','OBS regressions cover ownership and state checks. Requires a running API and reachable provider/relay. Failed reads retain last status, which can be stale.'],
   ['Camera preparation timeout','A sixty-second in-process timer clears its own unready reservation and attempts room deletion. Start failures clean up local media; stop errors remain retryable.','Code plus lifecycle regressions. The timer does not survive an API restart; no durable camera-reservation sweep is implemented. Ask an administrator to clear a stranded reservation.'],
   ['Playback and Android reconciliation','Viewer playback is torn down on local sign-out/session change; authorization is rechecked about every thirty seconds. Android checks authorization/current-room state about every fifteen seconds and handles LiveKit reconnect events.','Code inspection; API/UI tests verify request/session rules, not real network handover. SDK reconnection cannot guarantee that an ended room resumes.'],
   ['Request recovery','An interrupted review can be recovered after two minutes. Deterministic queue identity and atomic claims prevent duplicate approval writes.','Concurrent approval and stale-session behavior are tested. Refresh before retrying an uncertain action.'],
   ['Recording transfer','A background sweep processes saved media with leases, delayed retries and manual recovery. Source files are retained when transfer fails and removed only after confirmed archive transfer.','Recording/transfer tests exist; this guide has not completed a deployed full-session recording test. Empty or failed capture cannot be reconstructed from nothing.'],
  ]),
  detail('Technical detail: monitoring and verification boundaries',[
   p('Backend /api/health checks API availability. The authenticated /api/live-stream/obs route reconciles stream state; it is not a global uptime report. Live Recordings polls about every fifteen seconds. The server recording sweep runs about every fifteen seconds; automatic failed-transfer selection is bounded by attempt count, with manual recovery available. Relay recording parts can transfer while recording continues.'),
   p('Local refactor validation recorded 60 browser tests, 42 focused backend tests and 18 Android tests, plus browser builds/lint and Android build/lint. Broader AI tests had two failures also reproduced against unchanged source fixtures. These results are historical test evidence, not present deployment status, browser certification, capacity testing or physical media QA.'),
  ]),
 ]},
 {id:'troubleshooting',title:'Troubleshooting',blocks:[
  table(['Symptom','Likely causes','Check','Corrective action / escalation'],[
   ['Sign-in prompt / session expired','Signed out, expired/replaced account session, or insufficient role.','Confirm viewer sign-in or administrator role. Did the same account sign in on another device?','Sign in again on the intended device. Use a different viewer account for monitoring. Contact the account administrator if a valid account is repeatedly rejected.'],
   ['Already live / another connection exists','An active, waiting or ending source owns the slot.','Refresh Live studio and inspect source/status.','End that connection using its matching controls; wait for release. Ask the deployment administrator if revocation repeatedly fails or a camera reservation is stranded.'],
   ['Camera/microphone denied or no private preview','Permissions, insecure browser origin, unavailable device or another app using it.','Browser/Android permission settings, selected input and preview readiness.','Allow the intended input on a trusted HTTPS page, close conflicting capture apps and retry. Use a working input or OBS. Escalate persistent device/driver failures.'],
   ['OBS remains Waiting or key expires','No media, old connection details, wrong transport or blocked ingest.','OBS output log, two-minute window, Bearer token versus Stream key, current room.','Stop OBS, disconnect the old reservation, prepare again and replace its details. Apply the relay encoder settings when relevant. Administrator checks ingest, TURN and provider access.'],
   ['OBS preparation fails / ingress allowance reached','Relay unreachable, LiveKit quota, recording storage or permissions failure.','Read the displayed error; confirm the selected transport and Save recording choice.','Administrator checks the configured service and quota/storage capacity. Do not buy a plan, increase spending caps or switch transports blindly.'],
   ['Playback unavailable / silent picture','Stale room access, network traversal failure, no media, muted sound or autoplay restriction.','Confirm On air, sign-in and sound controls. Test a second network/device.','Use Reconnect preview and Enable sound; check source audio. Escalate continuing failures with time, source and non-secret error text.'],
   ['Comments or requests unavailable / broadcast changed','Stale session, API interruption, or per-account rate limit.','Refresh the current room; check sign-in and any wait message.','Reopen the current session; wait a minute after a rate limit. Administrator checks API/database failures. Do not repeatedly submit the same request.'],
   ['Request stuck Reviewing','A review stopped before confirmation or another administrator is working.','Read current status and wait at least two minutes.','Use Recover interrupted review, then refresh before another review. Escalate if recovery is rejected repeatedly; do not manually duplicate its queue entry.'],
   ['Recording Saving / Transfer failed / No recording','Transfer pending, disk/staging quota, provider failure, or no captured media.','Live Recordings status and error; source recording preference.','Wait for saving, use recovery for a retained source and refresh. Administrator checks storage/worker logs. No recording means there may be no file to recover.'],
   ['End or Disconnect does not finish','Provider deletion/revocation failed or the state changed.','Refresh current source and reservation.','Retry ending the current connection. OBS revocation retries while the backend worker runs; escalate continued Ending state rather than starting another source.'],
   ['AI unavailable / action not verified','Provider/worker unavailable, expired account, missing approval or changed room.','Read task outcome and current manual studio state.','Use manual controls. Re-read the room before approving another action; do not resubmit an uncertain write without checking its result. Administrator checks AI configuration/billing/worker.'],
  ]),
 ]},
 {id:'security',title:'Security, maintenance, and responsibilities',blocks:[
  list([
   'Administrators manage source connections, requests, moderation and recording publication. Signed-in audience members receive subscriber playback access and act as their own account identity. Administrator-only handlers enforce privileges on the server; the guide itself uses the existing admin dashboard gate and adds no data endpoint.',
   'The operator keeps OBS tokens private, prepares a new connection for each show, reviews AI approvals and confirms recording publication rights. AI and viewer content cannot bypass server permissions. Do not share screenshots containing connection details or send keys in support messages.',
   'The deployment administrator owns secure provider credentials, HTTPS/webhooks, media/TURN networking, updates, logs, quotas, storage capacity and spending limits. Keep secrets server-side; rotate compromised keys through the relevant provider and update the deployment together.',
   'Deploy compatible frontend, backend, relay access helper and Android builds together. Older Android clients do not send the new camera-readiness confirmation. Test sign-in, playback and recording after an update; use the hosting provider’s previous successful deployment for a reviewed code rollback.',
   'No complete backup/restore workflow is implemented in this dashboard. The owner and administrator must agree database/media/configuration backup retention and verify a restore process separately. Private staging and transfer retries are not backups. Download important Ready media to an owner-controlled location.',
   'Publishing recordings intentionally makes media public; archive-list removal does not undo publication. Obtain required content/event permissions and agree retention with the owner. The implementation does not provide automated copyright clearance or a data-retention compliance guarantee.',
  ]),
 ]},
 {id:'limitations',title:'Limitations and support',blocks:[
  list([
   'No confirmed deployed health, capacity, active provider plans, complete browser/device compatibility matrix or service-level guarantee is available from static documentation.',
   'One broadcast source at a time. No scheduled automatic start, browser screen sharing, multi-camera switcher inside Echo, simultaneous-source mixing, YouTube/Mux public-embed fallback or third-party social simulcast is supported by this refactored Live flow. OBS may mix its own configured sources.',
   'No seamless OBS session resume or recording stitching across a lost connection is promised. Prepare again after disconnecting. Split recording parts are supported; they are not a guarantee of gapless capture.',
   'The current account session model may sign out the Android broadcaster when the same account logs in elsewhere. A remote stop or authorization failure can stop phone capture. Independent concurrent sign-ins are not implemented by this refactor.',
   'Real camera/audio capture, venue network handover, signed-in viewing on separate physical devices, push/email delivery and a complete source-to-archive recording transfer still need coordinated deployment verification for the refactor.',
   'No dedicated technical support contact or response-time agreement is configured in the reviewed project. Contact the existing deployment/account administrator through your established channel. Provide the time, source, device/browser, affected screen and error text; omit passwords, tokens and private configuration. Booking/management example addresses in legacy site data are not a verified technical support channel.',
  ]),
 ]},
 ]
};
