// Admin-facing source audit, matching the Echo Docs report format.
export const eventAtomAuditGuideRoute='/admin/echo?tab=service-overview-operations-guide&guide=event-data-atom-audit';
export const eventAtomAuditGuide={
 "id": "event-data-atom-audit",
 "title": "Event page & Echo Smart Cart — Data atom audit",
 "reviewedOn": "2026-11-16",
 "introduction": "How Event-page data reaches Echo AI conversation, the concept map, booking review and client booking history. Includes atom ownership, audit findings, fixes, past-date/time protections and verification limits.",
 "sections": [
  {
   "id": "canonical-path",
   "title": "Canonical path",
   "blocks": [
    {
     "type": "paragraph",
     "text": "khalil-back/src/eventOrderContract.json defines atom paths, types, required flags, privacy, account ownership, option labels and limits. eventOrderCore.mjs validates and updates those values. npm run sync:contracts copies both into the frontend; the contract sync test detects drift."
    },
    {
     "type": "paragraph",
     "text": "Event form → EventOrderProvider.editDraft → validated current order → authenticated draft persistence. AI text/voice edits use the same draft writer and save receipts. Merely saying something in conversation does not change an atom."
    },
    {
     "type": "paragraph",
     "text": "Submission → prepareSubmittedOrder validates the full order and reapplies the authenticated account profile → the server saves ServiceRequest.order and its separate conversation snapshot. History reads that captured order, not the current editable draft."
    }
   ]
  },
  {
   "id": "event-atom-ownership",
   "title": "Event atom ownership",
   "blocks": [
    {
     "type": "table",
     "headers": [
      "Atom paths",
      "Entry point / authority",
      "Required",
      "Representation"
     ],
     "rows": [
      [
       "customer.fullName, .email, .phone, .contactMethod, .company",
       "Personal info; signed-in values belong to Dashboard account settings",
       "Contract-defined",
       "Personal info branch; account-owned fields cannot be changed by AI or booking controls"
      ],
      [
       "event.type",
       "Active event choices in the Event page; validated canonical type ID",
       "Yes",
       "Localized option label"
      ],
      [
       "event.title",
       "Event name; shown for Other or whenever an existing name is present",
       "No",
       "Client-provided name, preserved when the type changes"
      ],
      [
       "event.date",
       "Availability calendar or explicit AI date edit",
       "Yes",
       "Localized date; canonical value stays YYYY-MM-DD"
      ],
      [
       "event.startTime, .endTime",
       "Event time controls or explicit AI time edits",
       "Yes",
       "Toronto time; overnight end explicitly marked next day"
      ],
      [
       "event.guestCount",
       "Guests control or exact AI-provided number",
       "Yes",
       "Numeric value; no invented estimate"
      ],
      [
       "event.venue.name, .address, .city, .postalCode, .setting",
       "Venue result selection, manual entry, or validated AI-provided text",
       "Yes",
       "Same labels and values in Event recap, map and review; setting labels are localized"
      ],
      [
       "event.venue.addressDetails",
       "Unit / extra info field",
       "No",
       "Full saved detail; UI limit now matches the contract’s 300 characters"
      ],
      [
       "event.venue.country",
       "Venue selection’s country/default or validated text",
       "No",
       "Owner-visible in review; excluded from public conversational recaps"
      ],
      [
       "event.venue.latitude, .longitude, .source, .sourceId, .sourceAttribution",
       "Actual venue picker selection",
       "No",
       "Technical context, excluded from human review rows; AI can read existing facts but cannot invent/write them"
      ],
      [
       "event.setup.requirements",
       "Setup notes in Services",
       "No",
       "Rental/services branch; intentionally outside the Event page"
      ]
     ]
    },
    {
     "type": "paragraph",
     "text": "src/lib/eventPageModel.js owns the Event page’s step-to-atom mapping, recap projection, venue reset dependencies and atomic schedule patches. Contract labels and validation rules are not copied into this mapping."
    }
   ]
  },
  {
   "id": "the-four-surfaces",
   "title": "The four surfaces",
   "blocks": [
    {
     "type": "table",
     "headers": [
      "Surface",
      "Source and behavior"
     ],
     "rows": [
      [
       "Echo AI conversation",
       "aiOrderContext supplies known current atom values to text/voice. The server field guide includes bilingual labels, types, options, limits, privacy and explicit read-only flags. Current context is hydrated separately from proposed edits, preserving read-only location provenance. Tools expose only writable paths. Public recaps retain privacy filtering and use bookingFieldValue. Valid changes are acknowledged after account save receipts."
      ],
      [
       "Concept map",
       "BookingConceptMap uses BOOKING_GOALS and sectionLines; each row retains its canonical data-field path. Entered / needs attention / optional grouping reads the shared missing-field rules."
      ],
      [
       "Booking review",
       "Uses the same sectionLines model and AtomGroups as the concept map. bookingFieldValue formats localized enums, dates, Toronto times, overnight ends, song records, links, attachments, booleans and equipment quantities."
      ],
      [
       "Booking history in client workshop",
       "Submitted requests pass snapshot to BookingDraftReview, which uses submittedSectionLines over the captured request.order. It shows only captured, answered facts, saved equipment names and quantities, and “Submitted details.” It does not add today’s unselected catalog services or apply today’s draft-completion warnings to an old submission. Editable draft cards continue to use live catalog data."
      ]
     ]
    }
   ]
  },
  {
   "id": "issues-fixed",
   "title": "Issues fixed",
   "blocks": [
    {
     "type": "steps",
     "items": [
      "Separate Event recap formatting could disagree with the map/review. Event recap, map, review and short AI recaps now share bookingFieldValue; event/venue enum names come from the contract.",
      "Structured song records could produce blank summary values. Song names, artists, moments and links now remain visible; attachment names/comments and explicit No/zero values also survive formatting.",
      "Date/time clearing wrote invalid empty strings, leaving old canonical values despite cleared controls. Schedule changes now use one operation and null for cleared atoms. Changing the start can clear the old end atomically.",
      "A saved event title could disappear from the Event page after a type change. Existing titles stay visible and editable.",
      "Event-type buttons did not respect draft editability. They now disable with the draft.",
      "Submitted history depended on the current rental catalog. It now renders the submitted snapshot’s own facts.",
      "manualOnly atoms were exposed in the model’s edit schema. AI edits now reject them at schema, sanitizer and canonical draft-update layers. Actual client venue-result selections retain a distinct manual commit path, including their location metadata.",
      "Existing read-only context was reconstructed as an AI patch, risking loss of location provenance once write permissions were enforced. orderFromContext hydrates only known, validated atom paths without granting write access.",
      "Venue resets could retain the country, and changing a picked venue could retain extra address details. Reset/invalidation paths now share the Event model.",
      "AI could propose a past date or today’s elapsed start time. Text responses, voice update handling and shared AI patch validation now reject the schedule. No date/time from the rejected schedule is saved; text asks for a future date/start without claiming success. Submission also checks the current Toronto schedule. Overnight end times remain supported. No timezone comes from the browser or host locale."
     ]
    }
   ]
  },
  {
   "id": "limits-and-remaining-distinctions",
   "title": "Limits and remaining distinctions",
   "blocks": [
    {
     "type": "list",
     "items": [
      "Historical requests created without a canonical request.order cannot recover atoms that were never stored. The legacy service/payment display remains available; this change does not invent or backfill an event brief.",
      "“Private” controls conversational repetition, not whether the authenticated owner can see their own address/contact data in their review.",
      "Country and location provenance are derived metadata, not extra mandatory Event-page questions.",
      "Unknown event dates remain unknown: a time alone is not assumed to mean today. AI instructions ask for the date before interpreting that case.",
      "Past-time checks use the minute precision of stored HH:mm values; the current minute is not accepted as a future start.",
      "This audit does not change availability reservation policy, prices or booking lifecycle statuses. A valid future schedule still requires availability and team confirmation.",
      "Validation here uses code and integration tests; this pass does not claim browser visual QA."
     ]
    }
   ]
  },
  {
   "id": "verification",
   "title": "Verification",
   "blocks": [
    {
     "type": "paragraph",
     "text": "Frontend: 35 tests across Event atom projection/ownership, schedule updates, past-time rejection, localization, immutable history, manual-versus-AI permissions, goals, flow, calendar, time and contract synchronization."
    },
    {
     "type": "paragraph",
     "text": "Backend: 59 tests covering the AI field guide and permissions, Toronto temporal boundaries, text response rejection, chat/stream handling, current voice context, order validation and authenticated submission/conversation snapshots."
    },
    {
     "type": "paragraph",
     "text": "Production frontend build passes. Relevant commands:"
    },
    {
     "type": "details",
     "title": "Regression test command",
     "blocks": [
      {
       "type": "paragraph",
       "text": "node --test src/lib/eventPageModel.test.js src/lib/bookingDraftEdits.test.js src/lib/bookingGoals.test.js src/lib/fieldNames.test.js src/lib/bookingFlow.test.mjs src/lib/bookingCalendar.test.js src/lib/eventTime.test.mjs src/lib/contractsSync.test.js"
      }
     ]
    },
    {
     "type": "paragraph",
     "text": "From the backend checkout:"
    },
    {
     "type": "details",
     "title": "Regression test command",
     "blocks": [
      {
       "type": "paragraph",
       "text": "node --test src/event-atoms.test.js src/event-order.test.js src/ai-booking.test.js src/ai-booking-stream.test.js test/service-request-submission.test.js test/voice-context-current.test.js"
      }
     ]
    }
   ]
  }
 ]
};
