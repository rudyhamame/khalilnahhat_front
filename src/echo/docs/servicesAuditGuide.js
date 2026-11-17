const p=text=>({type:'paragraph',text});
const table=(headers,rows)=>({type:'table',headers,rows});
export const servicesAuditGuideRoute='/admin/echo?tab=service-overview-operations-guide&guide=services-page-audit';
export const servicesAuditGuide={
 id:'services-page-audit',title:'Services page — Data flow & refactoring audit',reviewedOn:'2026-11-16',
 introduction:'A dedicated review of the current Services page after its earlier refactor: DJ preferences, MC, rental equipment, sets, setup notes, special requests and their representation in Echo Smart Cart. Findings below describe the source as reviewed; open findings are not presented as completed fixes.',
 sections:[
 {id:'services-verdict',title:'Verdict: retain the existing refactor',blocks:[
 p('The Services page is already divided into focused components and shares the canonical booking provider, catalog loader and equipment validation. Another full rewrite is not justified. Targeted fixes are warranted for manual MC selection, numbering consistency, song-editor synchronization, recap completeness and draft editability.'),
 p('This audit adds documentation only. It does not change the Services page’s behavior or claim that the open findings have been repaired.'),
 {type:'links',items:[['Manage services and equipment','/admin/prices'],['Catalog & Echo AI audit','/admin/echo?tab=service-overview-operations-guide&guide=catalog-booking-ai'],['Event Audit','/admin/echo?tab=service-overview-operations-guide&guide=event-data-atom-audit']]},
 ]},
 {id:'services-architecture',title:'What the existing refactor already provides',blocks:[
 table(['Component / model','Responsibility','Assessment'],[
 ['RentalsHero and DjBookingForm','DJ service entry and the language, genre, event-moment song and favourite editors.','Already separate from rental browsing. Preserve this separation.'],
 ['ServiceVinyl and RentalWorkbench','Active service selection, equipment/set browsing, preview and quantity controls.','The workbench is separated from booking persistence; selections write through EventOrderProvider.'],
 ['SetupNotes','Optional event.setup.requirements input.','Uses the canonical field name and limit; disables editing with the draft.'],
 ['SpecialRequests','Inspiration photos (upload or links), event documents (upload), comments and the Additional notes.','Uses references.photos, references.images, references.files and additional.notes in the same draft.'],
 ['RentalsSoFar','Services-page recap and continuation into booking review.','Separate presentation component, but it re-derives some selection state and currently misses standalone service choices.'],
 ['useRentalCatalog','Shared catalog and equipment snapshots.','Refreshes both together; preserves the last complete snapshot on failure and listens for catalog revision notices.'],
 ['EventOrderProvider / prepareBookingDraftEdit','Account-owned draft editing, validation, equipment/service reconciliation and persistence.','Existing shared mutation boundary should remain. Do not create a second Services cart or persistence layer.'],
 ['rentalCatalog, numberedRentalCatalog and draftEquipment','Stable service keys, set membership, item tags, quantity/stock checks.','Useful shared models already exist; remaining UI derivations should converge on these.'],
 ]),
 {type:'diagram',label:'Current Services data path',paths:[['Admin catalog','Shared catalog snapshot','Services controls','Canonical booking draft','Save receipt'],['Saved draft','Echo AI / concept map','Booking review','Submitted order snapshot','Client booking history']],caption:'Choosing equipment changes a draft. It does not reserve inventory, submit a request or confirm availability.'},
 ]},
 {id:'services-atoms',title:'Data atoms and ownership',blocks:[
 table(['Atom / group','Owner and meaning','Entry and representation'],[
 ['music.djRequested and services','An explicit DJ decision, synchronized with the dj service key.','DJ entry controls and AI edits use the shared order rules. The recap and review show DJ separately from rentals.'],
 ['music.mcRequested','An explicit MC hosting decision, separate from MC accessories.','The contract and AI support it. Browsing the MC category or choosing its equipment must not silently imply MC hosting. The manual selection gap is an open finding below.'],
 ['music.languagePairs and music.genres','Client music preferences from the admin Work Elements vocabulary.','DJ form inputs write canonical atoms; concept map and review read the current order.'],
 ['music.suggestedSongs','Ordered records containing phase/moment, song, optional artist and HTTPS link.','Custom moments are supported. The local editor’s synchronization with external draft edits needs a targeted correction.'],
 ['music.favouriteSongs and music.favouriteArtists','Client favourites, including saved song/artist/link records.','Editors share the canonical draft. Structured summary formatting preserves song and artist information.'],
 ['equipment','Selected canonical equipment IDs and whole quantities; sets remain requested bundle lines.','Quantity controls write through the provider. Catalog IDs, minimums, stock and replacement lists are validated.'],
 ['services and rental.requested','Canonical service selections and the legacy rental-interest answer.','Equipment reconciliation infers service keys. Browsing a service is not a saved service decision.'],
 ['event.setup.requirements','Optional information about access, power, staging or the space.','Setup notes belongs to Services and the rental/services review branch.'],
 ['references.photos, references.images, references.files and additional.notes','Reference attachments, per-file comments and client requests.','Entered on Services; represented under Special requests in Smart Cart and saved in the submitted order.'],
 ]),
 p('The shared backend-owned event-order contract remains authoritative for field paths, types, required flags, privacy and account ownership. Services must not introduce ad-hoc atoms or writable account contact fields.'),
 ]},
 {id:'services-four-surfaces',title:'Echo Smart Cart: the four representations',blocks:[
 table(['Surface','Current source','Audit implication'],[
 ['Echo AI conversation','The current canonical draft, writable field guide and live numbered catalog. Text and voice commit through the shared provider and save receipts.','The manual workbench must display exactly the same item tags as the AI context. AI may read account details but cannot edit them.'],
 ['Concept map','BOOKING_GOALS and sectionLines, using shared bookingFieldValue formatting.','Reads saved atom values, not uncommitted local song rows. A stale editor can disagree with this accurate canonical view.'],
 ['Booking review','The same sectionLines model and AtomGroups renderer as the concept map.','MC is an explicit service decision. Equipment and song records should retain their quantities and structured details.'],
 ['Booking history in client workshop','The submitted request.order snapshot and submittedSectionLines.','Shows captured facts and equipment names, independent of the current catalog. Older requests without a saved order cannot recover data that was never stored.'],
 ]),
 p('RentalsSoFar is an additional Services-page recap. It should agree with these four surfaces, but currently derives its own empty/selected state from DJ and equipment alone.'),
 ]},
 {id:'services-open-findings',title:'Open findings: targeted fixes needed',blocks:[
 table(['Priority','Finding and evidence','Recommended correction'],[
 ['High','Manual MC choice is missing from the reviewed workbench. RentalWorkbench.chooseService changes the selected service and opens equipment; it does not write selectionField/music.mcRequested. MC accessory equipment maps to rental, not to the hosting decision.','Restore an explicit add/remove MC hosting control backed by the canonical atom. Keep accessories independent. Verify manual selection, AI selection and removal against the same saved order.'],
 ['High','Equipment tags can disagree for MC. ServiceVinyl appends all sets to a selectionField service’s displayed items, while numberedRentalCatalog numbers rentalServiceEquipment’s narrower list. RentalWorkbench derives tags from its displayed list. A visible set can therefore have a tag that the AI catalog does not contain.','Build the workbench’s item list and displayed composite tags from the exact same numbered snapshot supplied to AI. Test MC, ordinary services, global sets and catalog refreshes.'],
 ['High','DjBookingForm initializes its suggested-song rows from music.suggestedSongs only when mounted. There is no synchronization when AI or another draft update changes that atom while the editor remains open. Editing an old row can write the stale list back over newer songs.','Separate incomplete local rows from canonical saved songs and reconcile external updates without losing partial user input. Verify AI additions, corrections and account/draft switching while the form is open.'],
 ['Medium','RentalsSoFar treats the selection as empty when neither DJ nor equipment is present. It does not list standalone MC or other explicitly selected service-only choices, even when those exist in the canonical order.','Derive recap selections from a shared service/booking projection, and align the continuation rules with the canonical booking policy. Explicitly decide whether MC-only requests are supported; do not silently invent that policy in the recap.'],
 ['Medium','Draft editability is applied inconsistently. The DJ form fieldset and SetupNotes honor draftEditable, but RentalsHero’s add action, rental quantity controls and recap quantity/remove buttons do not consistently disable when the draft is unavailable. The provider rejects those writes, so this is primarily misleading interaction rather than permission bypass.','Pass one editability state through actionable Services controls and expose the provider’s loading/conflict state consistently. Preserve browsing and previews where editing is disabled.'],
 ['Resolved — documentation','The Catalog & Echo AI audit previously described former page chapters, writable contact fields, a fixed atom count and setup notes in the simulator. Its 16 November 2026 update corrects those statements and links to the dedicated audits.','Keep its source-review scope and deployment limits explicit. The behavior findings above remain open; a documentation correction does not fix page logic.'],
 ]),
 p('These are source-review findings. The focused shared-model tests passing does not prove that the identified component synchronization and UI gaps are covered.'),
 ]},
 {id:'services-refactor-plan',title:'Recommended scope for a follow-up refactor',blocks:[
 {type:'steps',items:[
 'Keep the existing hero, DJ form, rental workbench, setup notes and special-request components. Retain EventOrderProvider as the only mutation and save boundary.',
 'Unify rental item lists, service selection state and equipment tags with the shared numbered catalog. Add the explicit MC decision control.',
 'Make the suggested-song editor reconcile live canonical changes while preserving incomplete local input.',
 'Have the Services recap use a shared selection projection, including standalone explicit service choices and the existing canonical continuation policy.',
 'Propagate draft editability and save/error feedback consistently across booking actions.',
 'Update documentation after fixes and verify the same choices in conversation, map, review, reload and submitted history.',
 ]},
 p('A full Services-page rewrite or a new data store would duplicate working architecture and increase the chance of drift. The appropriate follow-up is a small set of shared-model and component-state corrections.'),
 ]},
 {id:'services-verification',title:'Verification and limits',blocks:[
 p('Focused verification: 10 automated checks passed for rental service inference, equipment replacement validation, canonical draft edits/save receipts, section ownership and the existing catalog guide. This was a source and shared-model review; no production booking, paid AI call or browser interaction was performed for this audit.'),
 p('The dedicated audit tab uses the existing administrator documentation renderer. Its route, active navigation state and section rendering are checked separately. Open findings above remain open; adding this document does not deploy behavior fixes.'),
 {type:'checklist',title:'Regression checks for the follow-up fixes',items:[
 'Add and remove MC hosting manually; confirm the same atom in AI conversation, map and review.',
 'Choose MC and browse all sets; ask AI for each visible equipment tag and confirm that it resolves to that exact item.',
 'Keep the song editor open while AI adds or edits a song; editing another row must preserve the AI change.',
 'Select standalone service choices and compare the Services recap with canonical review and continuation behavior.',
 'Trigger draft loading or a save conflict; booking buttons should explain or disable edits rather than appear to succeed.',
 'Submit a controlled request, change the catalog, and confirm that booking history retains the submitted names and quantities.',
 ]},
 ]},
 ]
};
