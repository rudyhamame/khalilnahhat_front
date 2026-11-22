import bookingAtoms from './contracts/booking-atoms.json' with {type:'json'};
import {fields,fieldName,getPath,isAnswered} from './eventOrderCore.mjs';
import {bookingFieldValue} from './bookingPresentation.js';

// Event page ownership, in UI order. Labels, limits and validation remain in
// the shared contract. Setup notes belong to Services, not this page.
export const EVENT_PAGE_STEPS=Object.freeze({
 personal:['customer.fullName','customer.email','customer.phone','customer.contactMethod','customer.phoneContact','customer.company'],
 occasion:['event.type','event.title'],
 schedule:['event.date','event.startTime','event.endTime'],
 guests:['event.guestCount'],
 venue:['event.venue.name','event.venue.address','event.venue.addressDetails','event.venue.city','event.venue.postalCode','event.venue.setting'],
});
export const VENUE_LOCATION_PATHS=['event.venue.address','event.venue.city','event.venue.postalCode','event.venue.country','event.venue.addressDetails','event.venue.latitude','event.venue.longitude','event.venue.source','event.venue.sourceId','event.venue.sourceAttribution'];
export const VENUE_RESET_PATHS=[...new Set([...EVENT_PAGE_STEPS.venue,'event.venue.country',...VENUE_LOCATION_PATHS])];
// STEP.SEC.ATOM index of every booking data atom. One table feeds the Booking page labels, the Booking review rows and the Echo conversation, so one number always means one atom.
// Step 01 Personal info, 02 Event info, 03 DJ Khalil Service, 04 Services info, 05 Additional info. The atom number is the position inside its section.
const ATOM_SECTIONS=bookingAtoms.sections;
const ATOM_CODES=Object.fromEntries(ATOM_SECTIONS.flatMap(([section,keys])=>keys.map((key,index)=>[key,`${section}.${String(index+1).padStart(2,'0')}`])));
export const fieldCode=key=>ATOM_CODES[key]||'';
// Every numbered booking atom, in table order.
export const ATOM_KEYS=Object.freeze(Object.keys(ATOM_CODES));
// The same code for a whole section ("02.01") when only the section is known.
export const sectionCode=key=>fieldCode(key).split('.').slice(0,2).join('.');
export const eventPageField=key=>fields.find(field=>field.key===key);
export function eventPageSummary(order,ar=false){
 return Object.values(EVENT_PAGE_STEPS).flatMap((paths,index)=>paths.filter(key=>(key!=='event.title'||order.event?.type==='other'||isAnswered(getPath(order,key)))&&(key!=='customer.phoneContact'||isAnswered(getPath(order,'customer.phone')))).map(key=>({key,step:index+1,label:fieldName(key,ar),value:bookingFieldValue(order,key,ar),empty:!isAnswered(getPath(order,key))})));
}

// A schedule edit is one draft operation. Clearing uses null (empty strings are
// invalid dates/times), so local controls and the saved order cannot disagree.
export function eventScheduleChanges(values){
 return Object.entries(values).filter(([key])=>['date','startTime','endTime'].includes(key)).map(([key,value])=>({path:`event.${key}`,value:value||null}));
}
