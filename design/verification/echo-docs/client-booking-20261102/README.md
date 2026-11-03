# Client booking refactor and guide review — 2026-11-02

Scope: the current signed-in canonical event-order questionnaire, API submission,
quote response and deposit-confirmation flow. No production request, email, payment,
account, inventory record or hosting configuration was changed for validation.

## Changes

- Extracted API request creation into `khalil-back/src/service-request-submission.js`
  with explicit dependencies for isolated HTTP tests.
- Added validated UUID submission identity and SHA-256 request fingerprints. A
  compound, partial unique index on user/submission identity protects concurrent
  creation. The handler awaits model initialization before protected submissions.
  Matching retries return the saved request; changed payloads conflict. Replay is
  checked before current-catalog normalization so catalog removal cannot hide an
  already saved request.
- The browser requires the API's matching canonical schema and
  `idempotentSubmission` capability. It preserves uncertain attempt identity in
  session storage scoped to account/draft, prevents overlapping submission,
  awaits the draft-save attempt, requires a valid receipt before clearing the
  form, and deduplicates the client request list.
- Added injectable quote/payment dependencies while preserving production
  defaults, allowing acceptance and deposit behavior to be exercised without a DB.
- Synchronized the shared event-order core. Its preexisting parity test found
  the backend copy was missing the browser's `voiceGreetingText` helper.
- Updated stale booking UI tests to the current labels and guided layout.
- Added Echo Docs → Service Overview & Operations Guide → Client Booking Process,
  with structured content, section links, architecture flow, expandable technical
  details, troubleshooting, source-reviewed limitations and acceptance checks.
  Existing administrator/session authorization remains authoritative. No new data
  endpoint was added for documentation.

## Source and configuration evidence

Browser: `src/echo/QuotePage.jsx`, `EventOrderProvider.jsx`, `GuidedBookingFlow.jsx`,
`AIBookingPanel.jsx`, `src/lib/accountEventDraft.js`, `eventOrderCore.mjs`,
`eventOrderContract.json`, `src/App.jsx`, `src/lib/api.js`,
`src/components/DashboardPage.jsx`, `AdminWorkspace.jsx`, `src/echo/EchoAdmin.jsx`,
`ServiceOperationsGuide.jsx`, `src/echo/docs/clientBookingGuide.js`.

API: `src/server.js`, `service-request-submission.js`,
`service-request-idempotency.js`, `event-order.js`, `eventOrderCore.mjs`,
`quote-validation.js`, `quote-lifecycle.js`, `payments.js`, `models.js`,
`vouchers.js`, `brevo.js`, `db.js`; `package.json`, `Dockerfile`, `render.yaml`,
`.env.example`, README configuration guidance. No environment secrets were copied
into this report or the client guide.

## Verification

- Backend `npm run test:booking`: **32 passed**, including authenticated HTTP
  submission, malformed payloads, canonical identity/selection enforcement,
  sequential/concurrent retries, account separation, payload conflicts, voucher
  rollback, mail failure, catalog removal replay and failed index initialization.
- Lifecycle HTTP tests: owner-only quote response, administrator-only payments,
  accepted/expired/changes-requested states, partial deposits, confirmation,
  taken-date rejection, tracked-stock shortage and reservation rollback after
  failed request persistence. Models and mail transport are test doubles.
- Frontend `npm test`: **109 passed**, including identity recovery, malformed
  receipt handling, canonical questionnaire, English/Arabic controls, signed-out
  and pending-session behavior, Echo Docs administrator gate, selected guide,
  fallback guide and section-anchor targets.
- Browser production build passed. Lint completed with existing warnings.
  Backend changed-module syntax checks and both repositories' diff whitespace
  checks passed.
- Observed in the existing signed-in local Chrome app: navigation from Echo Docs
  to Live Stream and Client Booking Process, dark desktop layout, responsive
  layout at 390 × 844, reliability section anchor and expanded technical details.
  Temporary viewport override was reset.

## Deployment and operational limits

The local Vite API proxy targets a deployed API by default. These backend changes
have **not** been deployed. Updated submission intentionally waits for an API that
advertises retry protection. Deploy the matching API/browser changes and verify
the compound unique index before operational acceptance.

Database uniqueness in a real MongoDB deployment, actual booking through client
and administrator sessions, sender delivery, stock data, backup/restore and
process-crash reconciliation remain unverified. Automated tests did not send email
or exercise a real payment.

Source-reviewed limitations are stated in the guide: no date hold on submission
or quote acceptance; no online card checkout; mail is best-effort; cancellation or
payment voiding does not automatically release a date; deposit rollback is not a
multi-document transaction; vouchers are saved, while shared quote totals do not
automatically subtract their discount. Final quoted amounts require admin review.
