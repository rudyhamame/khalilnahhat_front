# VP2: Personal / AI Booking

Personal Booking preserves the three-step guide and meeting link. Selecting AI
Booking embeds OpenAI chat or a browser WebRTC voice call in VP2. All provider
requests use the Khalil backend, not a browser API key.

Server environment: `OPENAI_API_KEY` (required), `OPENAI_BOOKING_CHAT_MODEL`
(default `gpt-4o-mini`), `OPENAI_BOOKING_VOICE_MODEL` (default `gpt-realtime-mini`).
Configure provider credentials privately in Render. No credential is loaded from another application's deployment or a remote host filesystem.

Development and public AI requests use https://echo-khalil-api.onrender.com by default. A developer can explicitly set `VITE_AI_BOOKING_PROXY_TARGET` for an isolated local API. Server-to-server session verification uses Render's trusted `/api/auth/me` endpoint; browser-provided account IDs are never authentication.

Safety: signed-in users only, explicit data-sharing consent, 20 chat requests
and three call starts per user per ten minutes, one concurrent call per user,
and server/client five-minute call limits. Closing/switching the panel stops
microphone capture and ends the call. After accepting the updated notice,
successful chat turns and available voice transcripts are saved to the client's
account in the Khalil backend's MongoDB `bookingconversations` collection.
Responses requests still use `store:false`. Raw call audio is not archived.
No AI booking/payment tools are exposed.

Client Workspace → Quotes & bookings → Conversation history lists the latest
100 conversations, with full saved messages and Toronto timestamps. Authenticated
`/api/ai-booking/conversations` list/detail/append routes always scope queries to
the verified account ID. Stable message IDs make retrying a save idempotent;
failed saves show a retry notice rather than silently claiming success.
Transcripts created before persistence was enabled cannot be recovered once
their original page-memory session has ended. Deploy `booking-conversations.js`
and its server registration alongside the frontend for production access.

The assistant gathers event date/times (Toronto), service preferences, guest
count and music style. Exact addresses/contact/payment information belong in
the separate customer review form. Review opens the existing booking form;
submitting and final confirmation remain the existing human-approved workflow.

Verification: `node --test src/ai-booking.test.js src/ai-booking-auth.test.js src/booking-conversations.test.js` in khalil-back,
`node --test src/lib/bookingConversationRecorder.test.js src/components/clientWorkspace.test.js`,
`npm run build` and `npm run lint` in khalil-front.

Official API references used:
- https://developers.openai.com/api/docs/guides/structured-outputs
- https://developers.openai.com/api/docs/guides/voice-webrtc
- https://developers.openai.com/api/reference/resources/realtime/subresources/calls/methods/hangup
