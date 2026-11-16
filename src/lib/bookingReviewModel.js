import {bookingFieldValue} from './bookingPresentation';
import {getPath,isAnswered,fieldName} from './eventOrderCore.mjs';
import {bookingSections} from './bookingSections';
import {goalFields,goalProgress,goalValue} from './bookingGoals';

export const draftValue=(order,key)=>key==='services'?(order.services||[]).filter(id=>id!=='dj'):getPath(order,key);
// Short "label: value" lines shown for a section in the live summary (answered fields first, then what is still missing).
// While the service catalog is still loading, the Rental section shows one "Loading" row instead of flat fields that become a tree a moment later.
export function sectionLines(order,goal,ar,rentals=[],catalogLoading=false){
 const progress=goalProgress(order,goal),tr=(en,arabic)=>ar?arabic:en;
 const tree=goal.id==='rentals'&&rentals.length>0,loading=goal.id==='rentals'&&catalogLoading&&!rentals.length;
 if(loading)return {progress,lines:[{key:'services',label:ar?'خدمات التأجير':'Rental services',value:ar?'جارٍ التحميل…':'Loading…',empty:true,required:false,group:2}]};
 // Rental services & equipment is listed as a tree: every service (MC included) with all of its equipment under it.
 const all=goalFields(goal).filter(field=>(!field.gate||getPath(order,field.gate)===true)&&!(tree&&['services','music.mcRequested','rental.requested','music.djMc'].includes(field.key)));
 // Every field of the section is listed with its value; fields not answered yet read "Not set yet".
 const lines=all.map(field=>({key:field.key,label:(fieldName(field.key,ar)||(ar?field.ar||field.label:field.label)).replace(/\s*[(（](?:optional|only if|اختياري)[^)）]*[)）]/i,''),value:bookingFieldValue(order,field.key,ar,draftValue(order,field.key)),empty:!isAnswered(draftValue(order,field.key)),required:progress.missing.some(item=>item.key===field.key)}));
 if(tree){
  const needs=progress.missing.some(item=>item.key==='services'),name=item=>ar?item.nameAr||item.name:item.name;
  for(const service of bookingSections(order,rentals).rentals){
   const group=service.on?0:needs?1:2;
   lines.push({key:`service:${service.id}`,label:name(service),value:service.on?tr('Added','مضاف'):goalValue(null,ar),empty:!service.on,required:false,group,items:service.equipment.map(item=>({key:`equipment:${service.id}:${item.id}`,label:name(item),value:item.quantity?`× ${item.quantity}`:'—',empty:!item.quantity}))});
  }
 }else if(goal.id==='rentals'&&order.equipment?.length)lines.push({key:'equipment',label:ar?'المعدات':'Equipment',value:bookingFieldValue(order,'equipment',ar)});
 return {progress,lines};
}

// A submitted brief is immutable: only captured values, independent of today's
// catalog, stock, newly required fields or unselected services.
export function submittedSectionLines(order,goal,ar=false){
 const {progress,lines}=sectionLines(order,goal,ar);
 return {progress:{...progress,missing:[]},lines:lines.filter(line=>!line.empty).map(line=>({...line,required:false,group:0}))};
}
