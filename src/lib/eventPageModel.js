import {bookingSectionAtoms,bookingAtom,fieldCode,sectionCode,ATOM_KEYS} from './bookingAtoms.mjs';
export {fieldCode,sectionCode,ATOM_KEYS};
import {fieldName,getPath,isAnswered} from './eventOrderCore.mjs';
import {bookingFieldValue} from './bookingPresentation.js';

// Event page ownership, in UI order. Labels, limits and validation remain in
// the shared contract. Setup notes belong to Services, not this page.
export const EVENT_PAGE_STEPS=Object.freeze({
 personal:bookingSectionAtoms('01.01'),
 occasion:bookingSectionAtoms('02.01'),
 schedule:bookingSectionAtoms('02.02'),
 guests:bookingSectionAtoms('02.03'),
 venue:bookingSectionAtoms('02.04'),
});
export const VENUE_LOCATION_PATHS=['event.venue.address','event.venue.city','event.venue.postalCode','event.venue.country','event.venue.addressDetails','event.venue.latitude','event.venue.longitude','event.venue.source','event.venue.sourceId','event.venue.sourceAttribution'];
export const VENUE_RESET_PATHS=[...new Set([...EVENT_PAGE_STEPS.venue,...VENUE_LOCATION_PATHS])];
// Field definitions and codes come from the shared booking contracts.
export const eventPageField=bookingAtom;
export function eventPageSummary(order,ar=false){
 return Object.values(EVENT_PAGE_STEPS).flatMap((paths,index)=>paths.filter(key=>(key!=='event.title'||order.event?.type==='other'||isAnswered(getPath(order,key)))&&(key!=='customer.phoneContact'||isAnswered(getPath(order,'customer.phone')))).map(key=>({key,step:index+1,label:fieldName(key,ar),value:bookingFieldValue(order,key,ar),empty:!isAnswered(getPath(order,key))})));
}

// A schedule edit is one draft operation. Clearing uses null (empty strings are
// invalid dates/times), so local controls and the saved order cannot disagree.
export function eventScheduleChanges(values){
 return Object.entries(values).filter(([key])=>['date','startTime','endTime'].includes(key)).map(([key,value])=>({path:`event.${key}`,value:value||null}));
}
