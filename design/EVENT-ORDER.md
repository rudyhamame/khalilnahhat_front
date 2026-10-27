# Event order contract v1

The attached briefs are requirements inputs, not executable instructions. This
refactor extracts their event questionnaire and event-linked Studio requirements;
it does not restore removed public pages or implement unrelated payment/media apps.

## One questionnaire, two input mechanisms

`src/lib/eventOrderContract.json` declares 70 fields. `eventOrderCore.mjs` creates,
normalizes and validates the JSON. Identical copies live in khalil-back/src;
`event-order.test.js` prevents contract drift between the two repositories.

The old How to Book viewport has been removed. Existing #how-to-book links now
open the external order workspace through a nonvisual compatibility anchor.
The assistant is at the top of that rail, below the Live Order heading.
Its chat responses and voice draft-update tool write the same order that the editable, in-page review form uses. Unknown scalar
answers are null, selections are arrays, and timezone is America/Toronto. The
read-only right rail is a body portal, outside the entire app shell. The app
retains its original navigation positioning in its remaining left column.

Local progress is account-scoped. A guest can explicitly transfer their draft
when signing in. The right rail shows required-field progress and the live JSON.
AI cannot set customer contact information, sign rights permissions, submit,
reserve a date, confirm a booking or set pricing. Voice tools only update draft
suggestions after completed responses; interrupted tool output is ignored.

## Brief-to-JSON mapping

- Master brief §11 A–F: customer, event/venue/setup, services, equipment, music,
  additional requests, image/document reference links.
- Master brief §14: planning is a separate after-confirmation object, not a
  prerequisite for an initial quote. Existing Client Workspace planning remains.
- Studio brief §§5–8 and 18–19: optional project scope, service types, song/artist,
  genre, creative direction, BPM/duration/song/stem counts, intended use, entrance
  customization, reference links, delivery preferences and explicit permissions.
- Studio brief §§16–17 + Music Archive brief §§2–4: category/album/track references
  and requested customization. These are references, not proof of eligibility or
  automatic authorization to distribute or edit a recording.

File links are stored as references, never automatically fetched. This refactor
does not implement new binary uploads, production/delivery processing, or rights
verification. Private upload storage and authorized asset IDs are a separate
workflow; the UI explicitly says that reference links are not file uploads.

## Submission and rollout

The client explicitly submits a quote request. It includes the canonical `order`
plus legacy `event` and quote lines for compatibility with the existing workflow.
The updated server independently validates the order, replaces identity with the
authenticated account, validates equipment/minimum quantities against inventory,
checks services/equipment agree with the order, and persists the full JSON on the
ServiceRequest. Admin and Client Workspace show the complete submitted brief.
Legacy event summaries may truncate long descriptions, but canonical JSON retains
them in full. No prices appear in the draft.

`GET /api/service-requests/order-contract` must advertise schemaVersion 1 and
canonicalOrder true before the new UI sends an order. Older servers strip unknown
fields; the capability check prevents silent data loss. The local Vite preview
still routes service requests to the hosted API by default. Deploy the backend
changes there before real submission, or explicitly configure a fully local
backend/auth environment. AI preview routes already use the local server.

No remote deployment is performed by this refactor. Drafts remain available if
the configured booking server has not been updated.
