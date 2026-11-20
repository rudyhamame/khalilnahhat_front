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
// STEP.SEC.ATOM label of a form field, e.g. event.type -> 02.01.01 (step 01 = Personal info, step 02 = Event info).
export function fieldCode(key){const groups=Object.values(EVENT_PAGE_STEPS),group=groups.findIndex(paths=>paths.includes(key));return group<0?'':[group===0?1:2,group===0?1:group,groups[group].indexOf(key)+1].map(n=>String(n).padStart(2,'0')).join('.');}
export const eventPageField=key=>fields.find(field=>field.key===key);
export function eventPageSummary(order,ar=false){
 return Object.values(EVENT_PAGE_STEPS).flatMap((paths,index)=>paths.filter(key=>(key!=='event.title'||order.event?.type==='other'||isAnswered(getPath(order,key)))&&(key!=='customer.phoneContact'||isAnswered(getPath(order,'customer.phone')))).map(key=>({key,step:index+1,label:fieldName(key,ar),value:bookingFieldValue(order,key,ar),empty:!isAnswered(getPath(order,key))})));
}

// A schedule edit is one draft operation. Clearing uses null (empty strings are
// invalid dates/times), so local controls and the saved order cannot disagree.
export function eventScheduleChanges(values){
 return Object.entries(values).filter(([key])=>['date','startTime','endTime'].includes(key)).map(([key,value])=>({path:`event.${key}`,value:value||null}));
}
