const p = text => ({type:'paragraph',text});
const list = items => ({type:'list',items});
const steps = items => ({type:'steps',items});
const table = (headers,rows) => ({type:'table',headers,rows});
const detail = (title,blocks) => ({type:'details',title,blocks});

export const clientBookingGuideRoute='/admin/echo?tab=service-overview-operations-guide&guide=client-booking-process';
export const clientBookingGuide={
 id:'client-booking-process',title:'Client Booking Process',reviewedOn:'2026-11-02',
 introduction:'A client submits an event brief to request a quotation. The request is reviewed by the Echo team; a date is not reserved until the accepted quote’s required deposit is recorded and the booking checks succeed.',
 sections:[
  {id:'overview',title:'Service overview',blocks:[
   p('The browser booking flow collects a signed-in client’s event details, requested services and equipment, and optional voucher. Echo validates the canonical event order again on the API, saves a pending service request, and attempts to notify the team. This is a quote request, not an instant booking or an online checkout.'),
   {type:'diagram',label:'Request to confirmed booking',paths:[['Client event brief','Server validation','Pending request','Admin quotation','Client accepts','Admin records deposit','Date and equipment checks','Confirmed booking']],caption:'The request remains unconfirmed until the required deposit and booking checks succeed.'},
   {type:'links',items:[['Client booking workspace','/dashboard/bookings'],['Administrator booking requests','/admin/services'],['Services and equipment catalog','/admin/prices']]},
  ]},
  {id:'client-flow',title:'Client booking flow',blocks:[
   steps(['Sign in or create an Echo account. The current guided event-order flow requires an authenticated, ready session.','Complete the event brief in the guided sections. Required fields are checked in the browser, then validated again by the API.','Choose requested services and equipment. The API checks submitted selections against the active equipment catalog.','Optionally validate and apply a voucher. It is reserved when the service request is saved.','Submit once. The browser checks that the API advertises the matching canonical event-order schema before sending the request.','Save the returned request number and follow its status in Client Workspace → Quotes & bookings.']),
   p('If submission fails, the form remains available for correction or retry. A submission ID makes a network retry of the same details return the existing request instead of creating a duplicate. The browser retains an uncertain attempt for the same account and draft in this tab’s session storage, allowing recovery after a reload when the saved details are unchanged. Editing the details generates a new submission ID. If browser storage is blocked or the tab was closed, check Client Workspace before creating another request.'),
  ]},
  {id:'admin-flow',title:'Review and quote',blocks:[
   steps(['Open Admin → Booking requests and review the event date, venue, requirements, requested services and equipment.','Check availability and any client follow-up needed. The request itself does not reserve a date or stock.','Prepare and send a quote with service prices, tax, deposit, validity period and payment instructions. Quote sending uses the configured email provider; the request remains in Echo if notification delivery fails.','Monitor the client’s response. An active quote can be accepted or returned with change requests. Expired quotes must be extended or reactivated by an administrator before acceptance.']),
   p('The quote is prepared by an administrator. The server calculates totals and checks allowed status transitions; it does not automatically price or approve a request.'),
  ]},
  {id:'confirmation',title:'Deposit and confirmation',blocks:[
   p('The current implementation does not collect card payments online. An administrator records a received deposit in the payment ledger using e-transfer, cheque, bank transfer or other, with an optional reference. A deposit is accepted only after the client accepts an active quote.'),
   p('When recorded deposits reach the quote’s configured deposit amount, the API checks that the request has an event date and that tracked equipment is available. It then creates the confirmed booking for that date and marks the request confirmed. A unique date constraint prevents a second confirmed booking on the same date.'),
   p('The confirmation email is attempted after the booking is saved. Email failure does not undo the persisted booking. Balances can be recorded after confirmation; refunds are recorded against amounts already received. Entries can be voided for audit history.'),
  ]},
  {id:'statuses',title:'Statuses and actions',blocks:[
   table(['Stage','Meaning','Who acts next'],[
    ['pending','Client request received; no quote has been sent and the date is not reserved.','Administrator reviews and prepares a quote.'],
    ['quoted','A quote is available and has an expiry.','Client accepts or requests changes.'],
    ['accepted','Client accepted the active quote. This alone does not confirm the booking.','Administrator records the deposit.'],
    ['changes requested','Client asked for quote changes.','Administrator reviews and sends a revised quote.'],
    ['expired','Quote validity ended before acceptance or deposit confirmation.','Administrator extends/reactivates if appropriate.'],
    ['confirmed','Deposit threshold was recorded and date/equipment checks passed.','Client and team can proceed with the confirmed event.'],
    ['cancelled','Administrator cancelled the request/quote.','Contact the team through existing account support channels.'],
   ]),
   {type:'links',items:[['Booking history','/dashboard/bookings'],['Booking requests','/admin/services'],['Transactions','/admin/transactions']]},
  ]},
  {id:'requirements',title:'Requirements and responsibilities',blocks:[
   {type:'list',items:['Required: an Echo client account and an active sign-in session to submit the current guided booking form.','Required: the deployed API must support the canonical event-order schema version shown by the browser contract check.','Required for confirmation: administrator review, a sent and accepted active quote, recorded deposit meeting the configured threshold, an event date, and available tracked equipment.','Optional: equipment selections and a valid voucher, depending on the request.','Operational dependency: database availability. Email delivery depends on server provider configuration and is best-effort. No email provider credential is shown in this guide.']},
  ]},
  {id:'reliability',title:'Reliability and recovery',blocks:[
   table(['Behavior','Implementation evidence','Limit'],[
    ['Required-field and order checks','Browser validation plus server-side canonical order validation and active-catalog selection checks.','A passing form cannot guarantee the requested date, venue or equipment will be available.'],
    ['Submission retry protection','A client-generated UUID and user-scoped unique database index prevent duplicate requests; a repeated matching payload returns the saved request.','A reused ID with changed data receives HTTP 409. Database index creation and deployed API version must be verified after deployment.'],
    ['Voucher reservation','Voucher is reserved before request creation and released if saving fails.','A process/database failure during voucher bookkeeping may require administrator review.'],
    ['Notifications','Request, quote and confirmation emails are attempted through configured server mail delivery.','Email failure does not roll back the request/booking; check the dashboard status and contact an administrator if no notice arrives.'],
    ['Date and inventory checks','Confirmation checks tracked equipment and enforces one confirmed event per date.','Availability is checked at deposit confirmation, not when a request or quote is submitted.'],
   ]),
   detail('Technical detail: verification boundary',[
    p('The booking API uses authenticated routes for creating requests and customer quote responses; administrator routes control quote/payment operations. The idempotency fingerprint covers the validated submitted event, order, requested items and voucher code before catalog normalization. A saved matching request can be returned even if its equipment has since left the catalog. Matching retries return HTTP 200 with replayed=true and do not resend the new-request notification. A payload mismatch for the same submission ID returns HTTP 409. Requests created before this feature have no client submission ID and continue through the existing flow. The browser requires the API to advertise idempotentSubmission support before submitting.'),
    p('The deployment administrator configures the database through MONGODB_URI and MONGODB_DB_NAME. Booking email depends on BREVO_API_KEY, EMAIL_FROM_ADDRESS, the service-request recipient setting and enabled notification rules. The existing Render configuration checks /api/health, which reports API process availability rather than booking, database-index or email acceptance. Keep credentials private and deploy the matching browser and API changes together.'),
    p('This report is based on local source review and focused automated tests. It does not verify production deployment, database index creation, provider delivery, real inventory, or a live customer-to-admin booking.'),
   ]),
  ]},
  {id:'troubleshooting',title:'Troubleshooting',blocks:[
   table(['Symptom','Check','Action'],[
    ['Booking form asks you to sign in','Confirm the client is signed in and session verification finished.','Sign in, then return to the booking form.'],
    ['Server update message before submit','The API’s event-order contract is missing or has a different schema version.','Do not resubmit repeatedly; ask the deployment administrator to update the API and verify the contract endpoint.'],
    ['Request rejected for details or equipment','Required fields may be missing, or selected items may no longer be active.','Review highlighted fields and refresh the service/equipment list before submitting.'],
    ['Submission response was lost','The request may already have been saved.','Retry without changing the form. The same submission ID should return the existing request. If details were changed, the new submission is treated as a separate request.'],
    ['Voucher rejected','Code may be expired, inactive, exhausted or ineligible.','Recheck the code and conditions; remove it to submit without the voucher if appropriate.'],
    ['No email received','Mail provider/settings or recipient delivery may have failed.','Check Client Workspace or Booking requests for persisted status. Ask an administrator to inspect server mail delivery; do not create a duplicate request solely to trigger email.'],
    ['Date not confirmed after acceptance','Deposit may not have been recorded or may be below the configured threshold; date/equipment may be unavailable.','Review payment ledger and booking request. Administrator resolves availability or updates the quote before recording further payment.'],
   ]),
  ]},
  {id:'security',title:'Security, limitations and support',blocks:[
   p('The current submission endpoint requires sign-in and takes customer identity from the authenticated account rather than trusting the form. Customer quote actions are scoped to the request owner. Administrator quote and payment actions require administrator authorization. Keep account passwords and any payment references private; do not put card data or secrets in event notes.'),
   p('The system does not reserve dates at request or quote time, guarantee availability, process online card payments, automatically approve requests, or guarantee email delivery. A confirmed date depends on the persisted deposit record and inventory checks. Use your established contact with the booking team; no dedicated technical support contact or response-time agreement was verified for this guide.'),
   p('Cancellation and payment voiding do not automatically release a confirmed date reservation. An administrator must reconcile the booking and payment records through the established operational process. The reservation rollback tested here handles a request-save error during deposit confirmation; it is not a cross-collection database transaction and does not prove recovery after an abrupt server crash. A voucher is stored with the request; the reviewed shared quote-total calculation does not automatically subtract its discount, so the administrator must verify the final quoted amounts.'),
   p('Reviewed against local browser and API source on 2 November 2026. Deployment status, database index creation, and end-to-end production behavior still require verification.'),
  ]},
  {id:'verification',title:'Refactor and test report',blocks:[
   list(['The submission handler is now a separate API module with explicit dependencies for local HTTP tests. Customer authentication and existing quote/payment authorization remain in place.','Repeated matching submissions reuse the saved request through an account-scoped submission ID and a unique database index. Changed details with a reused ID are rejected. The browser waits for the draft save attempt and checks the API’s retry-protection capability.','The browser keeps the form when the API fails to return a valid request reference; a retry no longer adds a duplicate row to its request list. Uncertain attempt identity is retained in tab session storage when available.','The shared event-order helper was synchronized between browser and API after its existing parity regression found a missing voice-greeting helper in the backend copy. Older UI assertions were updated to exercise the current questionnaire and guided sections.']),
   p('Local verification covers real HTTP handlers with in-memory database and email substitutes: authentication, canonical-order identity and service validation, matching retries and concurrent creates, changed payload conflicts, separate account scopes, voucher rollback, mail failure, and replay after catalog removal. Quote/payment checks cover ownership, expiry, change requests, partial deposits, confirmation, date conflict, insufficient tracked stock and reservation rollback on failed persistence. These tests do not connect to the production database or send real email.'),
   p('Review results: 32 focused backend tests and 109 tests in the configured browser test suite passed locally. The production browser build and lint command completed; lint retains existing warnings in other parts of the app. Administrator/session access, guide selection, section targets and English/Arabic booking controls are covered by rendered-component tests. The guide was also checked in Chrome at desktop size and 390px width; its section navigation and expandable technical details were exercised. These results describe this local review, not live deployment status.'),
   {type:'checklist',title:'Deployment acceptance — still to verify',items:['Deploy the matching frontend and API; verify the booking contract reports the matching schema and retry-protection support.','Confirm the user/submission unique index exists on the deployed service-request collection.','Use an agreed test account and non-production data to submit, review, accept and record a test deposit; verify the client and admin views match.','Verify the configured sender, request recipient and notification rules with an approved delivery test.','Verify database backup/restore and operational handling of cancelled dates, voided payments and any failed draft cleanup before relying on those workflows.']},
  ]},
 ]
};
