import {fields,getPath,isAnswered,missingOrderFields} from './eventOrderCore.mjs';
import {bookingNextStep} from './bookingNextStep.js';

export const BOOKING_GOALS=[
 {id:'event',title:'Event & date',ar:'الفعالية والموعد',section:'availability',face:'calendar',matches:path=>path.startsWith('event.')&&!path.startsWith('event.venue.')&&!path.startsWith('event.setup.')},
 {id:'venue',title:'Venue',ar:'المكان',section:'availability',face:'venue',matches:path=>path.startsWith('event.venue.')||path.startsWith('event.setup.')},
 {id:'music',title:'DJ & music',ar:'الدي جي والموسيقى',section:'work',matches:path=>path.startsWith('music.')&&!['music.mcRequested','music.djMc'].includes(path)},
 {id:'rentals',title:'Services & equipment',ar:'الخدمات والمعدات',section:'setup',matches:path=>['services','equipment','music.mcRequested','music.djMc','rental.requested'].includes(path)},
 {id:'contact',title:'Your details',ar:'معلوماتك',section:'booking',matches:path=>path.startsWith('customer.')},
 {id:'notes',title:'Preferences & notes',ar:'التفضيلات والملاحظات',section:'booking',matches:path=>path.startsWith('additional.')||path.startsWith('references.')},
];
export const bookingGoal=id=>BOOKING_GOALS.find(goal=>goal.id===id)||null;
export function goalFields(goal){return fields.filter(field=>goal.matches(field.key)&&!['coordinate'].includes(field.type)&&!['event.venue.source','event.venue.sourceId','event.venue.sourceAttribution'].includes(field.key));}
export function goalProgress(order,goal){
 const relevant=goalFields(goal),missing=missingOrderFields(order).filter(field=>goal.matches(field.key));
 const decisions=goal.id==='music'?['music.djRequested']:goal.id==='rentals'?['music.mcRequested','rental.requested']:[];
 for(const key of decisions)if(typeof getPath(order,key)!=='boolean'&&!missing.some(field=>field.key===key))missing.push({key});
 if(goal.id==='rentals'&&order.rental?.requested===true&&!order.equipment?.length&&!order.services?.some(id=>!['dj','mc'].includes(id))&&!missing.some(field=>field.key==='services'))missing.push({key:'services'});
 const answered=relevant.filter(field=>isAnswered(getPath(order,field.key))).length+(goal.id==='rentals'&&order.equipment?.length?1:0);
 return {answered,missing,complete:missing.length===0&&(answered>0||goal.id==='notes')};
}
export function goalNextStep(order,ar,id){
 const goal=bookingGoal(id);if(!goal)return bookingNextStep(order,ar);
 const {missing}=goalProgress(order,goal),global=bookingNextStep(order,ar);
 const field=missing.find(field=>field.key===global.path)||missing[0];
 if(field){const definition=fields.find(item=>item.key===field.key);return {path:field.key,section:goal.section,face:goal.face,text:field.key===global.path?global.text:ar?`ما القيمة التي تريدها لحقل «${definition?.ar||field.key}»؟`:`What would you like for ${definition?.label||field.key}?`};}
 return {path:null,section:goal.section,face:goal.face,text:ar?`يمكننا مراجعة ${goal.ar} أو تعديلها. ماذا تريد تغييره؟`:`We can review or change ${goal.title.toLowerCase()}. What would you like to adjust?`};
}
export function goalValue(value,ar=false){
 if(typeof value==='boolean')return ar?(value?'نعم':'لا'):(value?'Yes':'No');
 if(Array.isArray(value))return value.map(item=>typeof item==='object'?`${item.name||item.id} × ${item.quantity}`:item).join(', ');
 return value==null||value===''?(ar?'لم يُحدّد بعد':'Not set yet'):String(value);
}
