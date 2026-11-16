import {fields,getPath,isAnswered} from './eventOrderCore.mjs';
import {bookingNextStep,effectiveMissing} from './bookingNextStep.js';
import {bookingStepDefinition,bookingStepForField} from './bookingFlow.mjs';
import {fieldQuestion} from './fieldQuestion.js';

// Goals are the flow's sections (lib/bookingFlow.mjs): same titles, same order, same field-to-section mapping.
const GOAL_STEPS=[['contact','customer'],['event','event'],['music','music'],['rentals','equipment'],['notes','references']];
export const BOOKING_GOALS=GOAL_STEPS.map(([id,stepId])=>{const step=bookingStepDefinition(stepId);return {id,title:step.title,ar:step.ar,section:step.viewport||'booking',...(step.face?{face:step.face}:{}),matches:path=>bookingStepForField(path)===stepId};});
export const bookingGoal=id=>BOOKING_GOALS.find(goal=>goal.id===id)||null;
export function goalFields(goal){return fields.filter(field=>goal.matches(field.key)&&!['coordinate'].includes(field.type)&&!['event.venue.source','event.venue.sourceId','event.venue.sourceAttribution'].includes(field.key));}
export function goalProgress(order,goal){
 const relevant=goalFields(goal),missing=effectiveMissing(order).filter(field=>goal.matches(field.key));
 const answered=relevant.filter(field=>isAnswered(getPath(order,field.key))).length+(goal.id==='rentals'&&order.equipment?.length?1:0);
 return {answered,missing,complete:missing.length===0&&(answered>0||goal.id==='notes')};
}
export function goalNextStep(order,ar,id){
 const goal=bookingGoal(id);if(!goal)return bookingNextStep(order,ar);
 const {missing}=goalProgress(order,goal),global=bookingNextStep(order,ar);
 const field=missing.find(field=>field.key===global.path)||missing[0];
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
