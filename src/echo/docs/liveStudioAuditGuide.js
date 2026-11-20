const p=text=>({type:'paragraph',text});
const table=(headers,rows)=>({type:'table',headers,rows});
export const liveStudioAuditGuideRoute='/admin/echo?tab=service-overview-operations-guide&guide=live-studio-audit';
export const liveStudioAuditGuide={
 id:'live-studio-audit',title:'Live Studio — Architecture & lifecycle audit',reviewedOn:'2026-11-16',
 introduction:'Source audit and targeted refactor of the browser Live Studio. Covers ownership, recording progress, capture and recovery boundaries, remaining findings, and verification limits. This is not a deployment certification.',
 sections:[
 {id:'scope',title:'Scope and refactoring decision',blocks:[
 p('Live Studio already delegates camera/WebRTC publishing, composition, audio processing, destinations and recording storage to dedicated modules. A complete rewrite is not needed. This refactor removes progress polling and workspace measurement from AdminLiveStudio and isolates the elapsed timer. The studio continues to orchestrate setup, pause screens, preview, go live and reconnect.'),
 {type:'links',items:[['Open Live Studio','/admin/live-stream'],['Live Stream operations guide','/admin/echo?tab=service-overview-operations-guide&guide=live-stream'],['Recording archive and Posting Studio','/admin/echo?tab=live-archive']]},
 ]},
 {id:'ownership',title:'Implementation ownership',blocks:[
 table(['Owner','Responsibility'],[
 ['AdminLiveStudio.jsx','Operator UI, source/scenario selection, go-live prerequisites, pause/countdown controls, folder actions and reconnect orchestration.'],
 ['useWebrtcBroadcast.js','Capture and publishing lifecycle, private preview, stream tracks, pause/preflight, audio mixing and recording startup/stop.'],
 ['useOutputFormat.js','Landscape or Portrait live ratio, remembered in this browser. Two-camera layouts are composed in OBS and arrive as the OBS Virtual Camera.'],
 ['useStudioWorkspaceLayout.js','Preview heading measurements, available control workspace height, fullscreen observation and listener cleanup.'],
 ['LiveElapsedTimer.jsx','Session-scoped elapsed display stored in sessionStorage. This measures this tab’s connection time, not authoritative broadcast duration.'],
 ['Recording','The Studio no longer records in the browser. Recording is done in OBS (Matroska, hardware encoder) and the file is added to the archive by hand.'],
 ['LiveDestinations / liveDestinationSources','Social destination controls and output source choices.'],
 ['LiveArchiveAdmin / PostingStudio','Saved recording management, export/render jobs and explicit publishing of ready Echo portrait reels. Publishing is separate from going live.'],
 ]),
 ]},
 {id:'recording-monitor',title:'Recording progress fixes',blocks:[
 table(['Finding','Result'],[
 ['Overlapping folder reads','Replaced the asynchronous interval with a completion-scheduled poll. The next read starts only after the previous read finishes.'],
 ['Unhandled folder read failures','Read failures become a studio hint and retry on the next poll; a successful read clears that hint. Saved parts are not deleted.'],
 ['Polling after archive completion','Server progress polling stops on ready or partial. Missing/in-progress records and transient request failures retry.'],
 ['Late results after navigation or account/recording changes','Effect cleanup aborts requests and suppresses late callbacks. Server progress is shown only for the current token and recording id; local-only recordings show no previous server result.'],
 ['A folder is replaced while reading','The old folder’s pending read is discarded when the selected store changes.'],
 ['History changes missed by narrow equality checks','History comparison now includes full session metadata, including byte counts, filenames and completion fields.'],
 ]),
 p('Folder progress reads run about every 1.5 seconds after completion; server archive reads run about every 4 seconds after completion. Both are disabled while the studio is disabled. The progress card follows the latest named folder session while live, unfinished, or completed less than ten minutes ago. Server read failures retain the last matching status and retry; this status is not a proof of current server reachability.'),
 ]},
 {id:'capture-and-data',title:'Capture, recording and recovery boundaries',blocks:[
 p('Private preview does not put the stream on air. Go live validates the title, goal, composition issue and required recording folder before requesting a broadcast. Recording startup uses startStudioBroadcast; recording/storage failures with status 503 or 507 can offer an explicit device-only fallback when recording was requested. That fallback requires a selected folder and does not upload the local recording.'),
 p('The browser polls authenticated live ownership/status through useLiveStatus. The studio publishes through useWebrtcBroadcast and supplies the recording callbacks. Disk parts and manifests support recovery; periodic recovery and the online event retry pending work while avoiding uploads during an active live. End live removes the tab’s restore marker. Paused restoration requires the same-tab marker and an available pause frame; capture reconnection is not guaranteed to be gapless.'),
 p('Folder history in browser storage contains metadata, not footage. Actual recovery depends on the original folder and saved parts. Live recording and post-production are separate: the Posting Studio creates render jobs; a ready Echo 9:16 render must be explicitly published before it appears in public Reels. This audit changes no API permissions, recording retention or publishing policy.'),
 ]},
 {id:'remaining-findings',title:'Remaining findings and follow-up work',blocks:[
 table(['Status','Finding','Next step'],[
 ['Open','The resume countdown uses awaited one-second timers without a cancellation token. Ending live or unmounting during that countdown can leave stale UI callbacks running. The go-live countdown already checks preflight; the pause intro checks paused state.','Unify all three countdowns behind a cancellable controller and test end/unmount/rapid action races before changing capture behavior.'],
 ['Open','AdminLiveStudio still coordinates folder recovery actions, screen persistence and many capture effects. Extracting polling and layout reduces responsibility but does not complete every possible decomposition.','Separate recording actions and pause-screen orchestration in a later focused change with lifecycle tests.'],
 ['Open','The elapsed timer starts when this tab first connects and is restored from sessionStorage. It is not the server session start time.','Use a canonical server timestamp if authoritative elapsed broadcast duration is required.'],
 ['Verification required','Physical capture, audio routing, folder permissions, disconnect/reconnect, social egress and archive playback depend on browser, device and deployment services.','Run a supervised end-to-end session on the intended devices. Automated source checks do not certify these paths.'],
 ]),
 ]},
 {id:'verification',title:'Verification and limits',blocks:[
 p('Focused automated checks cover non-overlapping progress reads, handled failures and recovery, cancellation of scheduled/in-flight reads, ready/partial termination, recording selection and progress retention. Existing recording, fallback, audio and WebRTC lifecycle regression tests are run alongside the production frontend build. See the accompanying source verification record for commands and results.'),
 p('No real broadcast, camera/microphone permission prompt, device folder deletion, social publication or production deployment is performed by this audit. Existing Live Stream operations guidance remains available; this addendum is the current source record for the targeted studio refactor.'),
 ]},
 ],
};
