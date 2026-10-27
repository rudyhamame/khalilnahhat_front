# VP2: Personal / AI Booking

Personal Booking preserves the three-step guide and meeting link. Selecting AI
Booking embeds OpenAI chat or a browser WebRTC voice call in VP2. All provider
requests use the Khalil backend, not a browser API key.

Server environment: `OPENAI_API_KEY` (required), `OPENAI_BOOKING_CHAT_MODEL`
(default `gpt-4o-mini`), `OPENAI_BOOKING_VOICE_MODEL` (default `gpt-realtime-mini`).
The local RH/RabbitHole service contained an invalid placeholder credential;
it was rejected and not retained. With the owner's approval, the real shared
credential was subsequently retrieved privately from OVH's
`/srv/rh/secrets/portfolio-ai.env` into the git-ignored Khalil backend `.env`
(mode 0600). OpenAI authentication and access to both configured models were
verified. The OVH source file and portfolio service were not changed.

The dev proxy sends `/api/ai-booking` to `http://127.0.0.1:4310`; override with
`VITE_AI_BOOKING_PROXY_TARGET` when needed. Production uses the normal configured
backend API URL; deploy the new backend module there before enabling AI.
Development AI routes accept existing OVH account sessions through a
server-to-server verification against the trusted `/api/auth/me` endpoint
when the local database does not contain that session. Browser-provided user
IDs are never accepted as authentication, and failed verification stays closed.

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
