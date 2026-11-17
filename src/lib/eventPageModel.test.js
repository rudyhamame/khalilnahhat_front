import test from 'node:test';
import assert from 'node:assert/strict';
import {aiFields,fields,createEventOrder,getPath,aiOrderContext,orderFromContext,applyOrderPatch} from './eventOrderCore.mjs';
import {EVENT_PAGE_STEPS,VENUE_RESET_PATHS,eventPageSummary,eventScheduleChanges} from './eventPageModel.js';
import {bookingFieldValue} from './bookingPresentation.js';
import {sectionLines,submittedSectionLines} from './bookingReviewModel.js';
import {bookingGoal} from './bookingGoals.js';
import {prepareBookingDraftEdit} from './bookingDraftEdits.js';
import {bookingDraftSummary} from './bookingDraftSummary.js';

function sample(){const order=createEventOrder();Object.assign(order.event,{type:'other',title:'Community night',date:'2027-06-12',startTime:'19:00',endTime:'01:00',guestCount:120});Object.assign(order.event.venue,{name:'Saved venue',address:'123 Test St',city:'Toronto',postalCode:'M5V 1A1',addressDetails:'Unit 4',setting:'both'});return order;}
test('every Event-page atom exists once in the contract; other event facts have an explicit owner',()=>{
 const keys=Object.values(EVENT_PAGE_STEPS).flat();assert.equal(new Set(keys).size,keys.length);
 for(const key of keys)assert.ok(fields.some(field=>field.key===key),key);
 const technical=['event.venue.country','event.venue.latitude','event.venue.longitude','event.venue.source','event.venue.sourceId','event.venue.sourceAttribution'];
 for(const field of fields.filter(field=>field.key.startsWith('event.')))assert.ok(keys.includes(field.key)||technical.includes(field.key)||field.key.startsWith('event.setup.'),field.key);
 for(const field of fields.filter(field=>field.key.startsWith('event.venue.')))assert.ok(VENUE_RESET_PATHS.includes(field.key),field.key);
});
test('Event recap, concept-map/review rows and AI recap use the same values in both languages',()=>{
 const order=sample();
 for(const ar of [false,true]){
  const eventLines=sectionLines(order,bookingGoal('event'),ar).lines;
  for(const atom of eventPageSummary(order,ar).filter(atom=>atom.key.startsWith('event.'))){
   const review=eventLines.find(line=>line.key===atom.key);assert.ok(review,atom.key);assert.equal(atom.value,review.value,atom.key);
  }
  assert.ok(bookingDraftSummary(order,ar).includes(bookingFieldValue(order,'event.venue.setting',ar)));
 }
 assert.equal(bookingFieldValue(order,'event.venue.setting'),'Indoor and outdoor');
 assert.equal(bookingFieldValue(order,'event.venue.setting',true),'داخلي وخارجي');
 assert.match(bookingFieldValue(order,'event.endTime'),/1:00 AM \(Toronto, next day\)/);
 assert.match(bookingFieldValue(order,'event.endTime',true),/اليوم التالي/);
});
test('an existing Other event type description stays visible even when the event type changes',()=>{
 const order=sample();order.event.type='wedding';assert.ok(eventPageSummary(order).some(line=>line.key==='event.title'&&line.value==='Community night'));
});
test('structured songs, attachments, zero and explicit No survive atom presentation',()=>{
 const order=sample();order.music.suggestedSongs=[{phase:'Family tribute',song:'My song',artist:'My artist',link:'https://youtu.be/test'}];
 const row=sectionLines(order,bookingGoal('music'),false).lines.find(row=>row.key==='music.suggestedSongs');
 assert.match(row.value,/Family tribute: My song — My artist/);assert.match(row.value,/https:\/\/youtu.be\/test/);
 assert.equal(bookingFieldValue(order,'event.guestCount',false,0),'0');assert.equal(bookingFieldValue(order,'music.djRequested',false,false),'No');
 assert.equal(bookingFieldValue(order,'additional.inspiration',false,[{name:'Saved image',url:'https://example.com/image',comment:'Warm lighting'}]),'Saved image — Warm lighting');
});
test('submitted history keeps saved equipment names and facts regardless of today’s catalog',()=>{
 const order=sample();order.services=['sound'];order.equipment=[{id:'retired-speaker',name:'Original speaker name',quantity:2}];
 const before=structuredClone(order),goal=bookingGoal('rentals'),snapshot=submittedSectionLines(order,goal);
 assert.match(snapshot.lines.find(line=>line.key==='equipment').value,/Original speaker name × 2/);
 assert.equal(snapshot.progress.missing.length,0);assert.ok(snapshot.lines.every(line=>!line.empty&&!line.required));
 sectionLines(order,goal,false,[{id:'new-service',bookingServiceId:'lighting',name:'New catalog service',equipment:[]}]);
 assert.deepEqual(submittedSectionLines(order,goal),snapshot);assert.deepEqual(order,before);
});
test('clearing a schedule really clears its saved atoms; a new start can clear the previous end atomically',()=>{
 const order=sample();const result=prepareBookingDraftEdit(order,eventScheduleChanges({date:null,startTime:'',endTime:null}),{source:'manual'});
 assert.deepEqual(result.rejectedFields,[]);for(const path of EVENT_PAGE_STEPS.schedule)assert.equal(getPath(result.order,path),null);
 const changed=prepareBookingDraftEdit(order,eventScheduleChanges({startTime:'20:00',endTime:null}),{source:'manual'});
 assert.equal(changed.order.event.startTime,'20:00');assert.equal(changed.order.event.endTime,null);assert.equal(changed.order.event.date,order.event.date);
});
test('venue picker metadata is manually writable and AI-readable, but never AI-writable',()=>{
 const order=sample(),patch=[{path:'event.venue.latitude',value:43.65},{path:'event.venue.source',value:'osm'}];
 const manual=prepareBookingDraftEdit(order,patch,{source:'manual'});assert.deepEqual(manual.rejectedFields,[]);
 const ai=prepareBookingDraftEdit(order,patch,{source:'ai'});assert.equal(ai.rejectedFields.length,2);assert.equal(ai.order.event.venue.latitude,null);
 const hydrated=orderFromContext({...aiOrderContext(manual.order),'unknown.path':'ignored'});
 assert.equal(hydrated.event.venue.latitude,43.65);assert.equal(hydrated.event.venue.source,'osm');assert.equal(hydrated.unknown,undefined);
 assert.equal(applyOrderPatch(order,patch).event.venue.latitude,null);
 for(const field of aiFields.filter(field=>field.manualOnly))assert.ok(!applyOrderPatch(order,[{path:field.key,value:'invented'}]).event.venue.latitude);
});
test('AI rejects past dates and past starts today using Toronto time, preserving the existing schedule',()=>{
 const now=new Date('2027-06-12T16:00:00Z'),order=sample(); // noon Toronto (EDT)
 for(const patch of [eventScheduleChanges({date:'2027-06-11',startTime:'19:00',endTime:'01:00'}),eventScheduleChanges({startTime:'11:30',endTime:'18:00'}),eventScheduleChanges({startTime:'12:00'})]){
  const result=prepareBookingDraftEdit(order,patch,{source:'ai',now});
  assert.equal(result.reason,'past_event_schedule');assert.ok(result.rejectedFields.length);
  assert.deepEqual(result.order.event,order.event);
 }
 const future=prepareBookingDraftEdit(order,eventScheduleChanges({date:'2027-06-12',startTime:'18:00',endTime:'01:00'}),{source:'ai',now});
 assert.deepEqual(future.rejectedFields,[]);assert.equal(future.order.event.endTime,'01:00');
});
