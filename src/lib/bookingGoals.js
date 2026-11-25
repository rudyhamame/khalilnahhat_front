import {BOOKING_TREE_STEPS,bookingAtomApplies} from './bookingAtoms.mjs';
import {fields,getPath,isAnswered} from './eventOrderCore.mjs';
import {bookingNextStep,effectiveMissing} from './bookingNextStep.js';
import {bookingStepDefinition,bookingStepForField,hasBookingServices} from './bookingFlow.mjs';
import {fieldQuestion} from './fieldQuestion.js';
import {treeSteps} from './treeCore.js';

// Goals are the flow's sections (lib/bookingFlow.mjs): same titles, same order, same field-to-section mapping.
const GOAL_STEPS=BOOKING_TREE_STEPS.map(step=>[step.id==='customer'?'contact':step.id,step.id]);
export const BOOKING_GOALS=GOAL_STEPS.map(([id,stepId])=>{const step=bookingStepDefinition(stepId);return {id,title:step.title,ar:step.ar,section:step.viewport||'booking',...(step.face?{face:step.face}:{}),matches:path=>bookingStepForField(path)===stepId};});
// Catalogue availability controls which sections exist; headings always follow the Booking bible.
// BOOKING_GOALS stays the full list for the AI, submitted snapshots and dashboards.
export function activeGoals(){
 const present=treeSteps();
 return BOOKING_GOALS.filter(goal=>goal.id!=='music'||hasBookingServices(present));
}
export const bookingGoal=id=>BOOKING_GOALS.find(goal=>goal.id===id)||null;
// Apply the same gates as the page; keep a saved custom event description visible for correction.
export const ownTypeApplies=(order,key)=>bookingAtomApplies(order,key);
export function goalFields(goal){return fields.filter(field=>goal.matches(field.key)&&!['coordinate'].includes(field.type)&&!['event.venue.source','event.venue.sourceId','event.venue.sourceAttribution'].includes(field.key));}
export function goalProgress(order,goal){
 const relevant=goalFields(goal).filter(field=>ownTypeApplies(order,field.key)),missing=effectiveMissing(order).filter(field=>goal.matches(field.key));
 const answered=relevant.filter(field=>isAnswered(getPath(order,field.key))).length+(goal.id==='music'&&order.equipment?.length?1:0);
 return {answered,missing,complete:missing.length===0&&answered>0};
}
export function goalNextStep(order,ar,id){
 const goal=bookingGoal(id);if(!goal)return bookingNextStep(order,ar);
 const {missing}=goalProgress(order,goal),global=bookingNextStep(order,ar);
 const present=treeSteps();
 const candidate=goal.id==='music'?[...(present.dj?['music.djRequested']:[]),...(present.mc!==false?['music.mcRequested']:[]),...(present.rental?['rental.requested']:[])]:[];
 const optionalKey=candidate.find(key=>getPath(order,key)==null);
 const optional=optionalKey?{key:optionalKey}:null;
 const field=optional||missing.find(field=>field.key===global.path)||missing[0];
 if(field){const definition=fields.find(item=>item.key===field.key);return {path:field.key,section:goal.section,face:goal.face,text:field.key===global.path?global.text:fieldQuestion(definition||field,ar)};}
 return {path:null,section:goal.section,face:goal.face,text:ar?`يمكننا مراجعة ${goal.ar} أو تعديلها. ماذا تريد تغييره؟`:`We can review or change ${goal.title.toLowerCase()}. What would you like to adjust?`};
}
export function goalValue(value,ar=false){
 if(typeof value==='boolean')return ar?(value?'نعم':'لا'):(value?'Yes':'No');
 if(Array.isArray(value))return value.map(item=>{
  if(!item||typeof item!=='object')return String(item);
  if(item.language)return item.dialect?`${item.language} (${item.dialect})`:item.language;
  const name=item.name||item.id;return item.quantity!=null?`${name} × ${item.quantity}`:String(name??'');
 }).filter(Boolean).join(', ');
 return value==null||value===''?(ar?'لم يُحدّد بعد':'Not set yet'):String(value);
}
