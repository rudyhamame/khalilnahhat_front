import {fields,getPath,isAnswered} from './eventOrderCore.mjs';
import {bookingNextStep,effectiveMissing} from './bookingNextStep.js';
import {bookingStepDefinition,bookingStepForField} from './bookingFlow.mjs';
import {fieldQuestion} from './fieldQuestion.js';
import {treeSteps} from './treeCore.js';

// Goals are the flow's sections (lib/bookingFlow.mjs): same titles, same order, same field-to-section mapping.
const GOAL_STEPS=[['contact','customer'],['event','event'],['music','music'],['rentals','equipment'],['additional','additional']];
export const BOOKING_GOALS=GOAL_STEPS.map(([id,stepId])=>{const step=bookingStepDefinition(stepId);return {id,title:step.title,ar:step.ar,section:step.viewport||'booking',...(step.face?{face:step.face}:{}),matches:path=>bookingStepForField(path)===stepId};});
// The sections of the Booking summary that exist in the catalogue: the DJ section needs a `dj` service (and takes its name), the
// rental section needs a rental service. BOOKING_GOALS stays the full list for the AI and the tests.
export function activeGoals(){
 const present=treeSteps();
 return BOOKING_GOALS.filter(goal=>(goal.id!=='music'||present.dj)&&(goal.id!=='rentals'||present.rental)).map(goal=>goal.id==='music'&&present.djName?{...goal,title:present.djName,ar:present.djNameAr||present.djName}:goal);
}
export const bookingGoal=id=>BOOKING_GOALS.find(goal=>goal.id===id)||null;
// "Your event type" (event.title) exists only when the client chose the type Other and types their own.
export const ownTypeApplies=(order,key)=>key!=='event.title'||order?.event?.type==='other';
export function goalFields(goal){return fields.filter(field=>goal.matches(field.key)&&!['coordinate'].includes(field.type)&&!['event.venue.source','event.venue.sourceId','event.venue.sourceAttribution'].includes(field.key));}
export function goalProgress(order,goal){
 const relevant=goalFields(goal).filter(field=>ownTypeApplies(order,field.key)),missing=effectiveMissing(order).filter(field=>goal.matches(field.key));
 const answered=relevant.filter(field=>isAnswered(getPath(order,field.key))).length+(goal.id==='rentals'&&order.equipment?.length?1:0);
 return {answered,missing,complete:missing.length===0&&answered>0};
}
export function goalNextStep(order,ar,id){
 const goal=bookingGoal(id);if(!goal)return bookingNextStep(order,ar);
 const {missing}=goalProgress(order,goal),global=bookingNextStep(order,ar);
 const present=treeSteps();
 const candidate=goal.id==='music'?['music.djRequested',...(present.mc!==false?['music.mcRequested']:[])]:goal.id==='rentals'?['rental.requested']:[];
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
