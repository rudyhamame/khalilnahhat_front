import {BOOKING_TREE_STEPS,bookingTreeStepForField} from './bookingAtoms.mjs';
import {contract,getPath,missingOrderFields} from './eventOrderCore.mjs';
const all=contract.sections.flatMap(section=>section.fields.map(field=>({...field,gate:field.gate??section.gate})));
const definitions=BOOKING_TREE_STEPS;
// The sections are defined once, here. Goals, the Booking summary and the assistant read their titles and order from this list.
export const bookingStepDefinition=id=>definitions.find(step=>step.id===id)||null;
export const stepLabel=id=>{const step=bookingStepDefinition(id);return [step.title,step.ar];};
export const bookingStepForField=bookingTreeStepForField;
export function bookingSteps(order){
 // Four sections, exactly the Booking page's steps and names: Personal info, Event info, Echo Services (DJ, MC and rental equipment), Additional info.
 return definitions.map(step=>({...step,fields:all.filter(field=>bookingStepForField(field.key)===step.id&&(!field.gate||getPath(order,field.gate)===true))}));
}
export function bookingIssueStep(order,issues){const keys=new Set(issues.map(issue=>typeof issue==='string'?issue:issue.key));return bookingSteps(order).find(step=>step.fields.some(field=>keys.has(field.key)))?.id||(keys.has('equipment')?'music':'additional');}
export function firstIncompleteStep(order){return bookingIssueStep(order,missingOrderFields(order));}
export function missingViewportFields(order){return missingOrderFields(order).filter(field=>['customer','event'].includes(bookingStepForField(field.key)));}
export const djServiceChoice=order=>order.services?.includes('dj')?'dj':'none';
export function djServiceChanges(order,choice){
 return [{path:'music.djRequested',value:choice!=='none'}];
}

export function venueSelectionChanges(place){
 const fields={name:String(place.name||'').slice(0,160),address:String(place.address||'').slice(0,240),city:String(place.city||'').slice(0,80),postalCode:place.postalCode||'',country:place.country||'Canada',addressDetails:place.details||null,latitude:place.latitude??null,longitude:place.longitude??null,source:place.source||null,sourceId:place.sourceId||null,sourceAttribution:place.sourceAttribution||null};
 return Object.entries(fields).map(([key,value])=>({path:'event.venue.'+key,value}));
}

export const hasBookingServices=present=>Boolean(present?.dj||present?.mc||present?.rental);
