import test from 'node:test';
import assert from 'node:assert/strict';
import {aiFields,fields,isAiEditableField,optionName} from './eventOrderCore.mjs';
import {BOOKING_GOALS,goalFields} from './bookingGoals.js';

// Audit of the booking data atoms: one contract, shown everywhere the same way, nothing extra.
const SUPPORT=new Set(['event.venue.latitude','event.venue.longitude','event.venue.source','event.venue.sourceId','event.venue.sourceAttribution']); // map provenance, not client atoms
test('every atom has both names, and every option has both names',()=>{
 for(const field of fields){
  for(const key of ['label','ar','short','shortAr'])assert.ok(field[key],`${field.key}.${key}`);
  for(const option of field.options||[])assert.ok(field.optionNames?.[option]?.[0]&&field.optionNames[option][1],`${field.key} option ${option}`);
 }
});
test('every client atom is shown by exactly one section of the review, the concept map and the booking history',()=>{
 const seen=new Map();
 for(const goal of BOOKING_GOALS)for(const field of goalFields(goal))seen.set(field.key,[...(seen.get(field.key)||[]),goal.id]);
 for(const field of fields){if(SUPPORT.has(field.key))continue;assert.equal(seen.get(field.key)?.length,1,`${field.key} → ${seen.get(field.key)}`);}
});
test('the conversation can only create atoms that exist in the booking contract (plus the equipment cart)',()=>{
 const known=new Set([...fields.map(field=>field.key),'equipment']);
 for(const field of aiFields)if(isAiEditableField(field.key))assert.ok(known.has(field.key),`${field.key} is not a booking atom`);
});
test('retired atoms stay retired, and service names come from the contract only',()=>{
 for(const key of ['music.styles','music.otherLanguage','music.dialects','music.otherPreferences','music.entrance','music.customMix','music.announcements','references.documents','additional.specialRequests'])assert.equal(fields.some(field=>field.key===key),false,key);
 assert.equal(fields.find(field=>field.key==='customer.contactMethod').options.includes('whatsapp'),false);
 for(const id of ['dj','mc','sound','lighting','led','fx','rental','corporate'])assert.notEqual(optionName('services',id),id,id);
});
