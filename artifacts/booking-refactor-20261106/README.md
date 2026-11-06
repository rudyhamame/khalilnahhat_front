# Booking and Echo assistance refactor — November 6, 2026

## Implemented

- Canonical draft edits return an exact order snapshot and updated/rejected field receipt. Manual controls and Echo share the same order; AI task confirmation follows a successful account save without render polling.
- Serialized AI task writes discard stale draft completions. Modify retains task history and asks for a replacement answer.
- Submission waits for assistant writes and conversation persistence, validates a fresh order snapshot and requires a durable request reference. It then retires the submitted draft and its original conversation; the independent conversation snapshot stays on the admin request.
- Venue selection saves the grouped venue task and asks the next question. Text and realtime voice can continue from the map selection.
- Current-subject permission recognizes direct client navigation requests. DJ and MC stay in their separate chapters.
- Shared server/client order helpers are synchronized. Server live-data instructions now agree with automatic task saves.
- Removing a voucher through Echo or the form no longer silently re-adds the public offer.
- Admin `/admin/services` refreshes incoming requests on focus and every 15 seconds while visible, preserves last successful rows on read failure and rejects obsolete responses.

## Evidence

- 90 frontend booking tests pass; 87 backend booking tests pass.
- Production frontend build passes. Existing build warnings concern chunk size, dynamic import effectiveness and existing eval use.
- Actual English browser booking: ECHO-MW4LWX88, wedding December 14, 2027, 85 guests after a Modify correction, DJ service, map-selected Manulife Centre, 23 saved text messages.
- Actual Arabic API-assisted booking: ECHO-MW4LZAVR, graduation December 15, 2027, 50 guests, two catalog speakers selected through a numbered tag, 22 persisted messages including the resumed QA run. Identical retry returns the same request.
- Both requests independently verified in the signed-in admin Booking requests tab and through owned API reads plus read-only database inspection. Both remain pending, visibly labeled QA TEST ONLY; no quote published, payment recorded or event/date reservation created.
- QA client's active draft is absent after submission. Submitted conversation snapshots remain visible in admin; Arabic content verified in the DOM.

## Limits

Live Arabic case used real chat/model HTTP requests and canonical draft edits; it was not a physical voice call. OpenAI/Alibaba/browser voice lifecycle, manual turn triggering, tool continuation, interruption and speaker-feedback capture guards are covered by transport/component tests. Physical camera microphone acoustics still require device QA.

The QA session and database credentials were held only in private temporary files and are excluded from these artifacts. To rerun the live script, explicitly pass `--submit` and `ECHO_QA_SESSION` for an isolated QA client. The script refuses normal client accounts and creates actual pending requests.
