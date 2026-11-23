import {bookingFieldValue} from './bookingPresentation.js';
import {getPath,isAnswered,fieldName} from './eventOrderCore.mjs';
import {bookingSections} from './bookingSections.js';
import {goalFields,goalProgress,goalValue,ownTypeApplies} from './bookingGoals.js';
import {ATOM_KEYS} from './eventPageModel.js';

// Review lines follow the booking contract order (its codes 01.01.01 → 05.03.01); the rental tree sits where the `equipment` atom is.
const atomRank=key=>{const i=ATOM_KEYS.indexOf(key.startsWith('service:')?'equipment':key);return i<0?1e6:i;};

export const draftValue=(order,key)=>key==='services'?(order.services||[]).filter(id=>id!=='dj'):getPath(order,key);
// Short "label: value" lines shown for a section in the live summary (answered fields first, then what is still missing).
// While the service catalog is still loading, the Rental section shows one "Loading" row instead of flat fields that become a tree a moment later.
// What is in stock for an equipment row of the review: the count, "Out of stock", or "On request" when the catalog has no count.
export function stockLabel(item,ar=false){
 const tr=(en,arabic)=>ar?arabic:en;
 if(item?.availabilityStatus==='unavailable')return tr('Out of stock','غير متوفر');
 if(Number.isSafeInteger(item?.availableQuantity)&&item.availableQuantity>=0&&item.availabilityStatus==='available')return String(item.availableQuantity);
 return tr('On request','حسب الطلب');
}
export function sectionLines(order,goal,ar,rentals=[],catalogLoading=false){
 const progress=goalProgress(order,goal),tr=(en,arabic)=>ar?arabic:en;
 const tree=goal.id==='rentals'&&rentals.length>0,loading=goal.id==='rentals'&&catalogLoading&&!rentals.length;
 if(loading)return {progress,lines:[{key:'services',label:ar?'خدمات التأجير':'Rental services',value:ar?'جارٍ التحميل…':'Loading…',empty:true,required:false,group:2}]};
 // Rental equipment is listed as a tree: every equipment category with all of its equipment under it.
 const all=goalFields(goal).filter(field=>ownTypeApplies(order,field.key)&&(!field.gate||getPath(order,field.gate)===true)&&field.key!=='services'); // services is internal logic, not a booking atom: DJ and MC have their own lines
 // Every field of the section is listed with its value; fields not answered yet read "Not set yet".
 const lines=all.filter(field=>field.key!=='event.setup.requirements'||order.rental?.requested===true||isAnswered(getPath(order,field.key))).map(field=>({key:field.key,reviewValue:draftValue(order,field.key),label:(fieldName(field.key,ar)||(ar?field.ar||field.label:field.label)).replace(/\s*[(（](?:optional|only if|اختياري)[^)）]*[)）]/i,''),value:bookingFieldValue(order,field.key,ar,draftValue(order,field.key)),...(field.key.startsWith('music.')||field.key.startsWith('references.')?{rawValue:draftValue(order,field.key)}:{}),empty:!isAnswered(draftValue(order,field.key)),required:progress.missing.some(item=>item.key===field.key)}));
 if(goal.id==='rentals'&&order.rental?.requested===false&&order.equipment?.length){const decision=lines.find(line=>line.key==='rental.requested');if(decision)decision.value+=tr(' — selected equipment is still saved; remove it or enable rentals.',' — المعدات المختارة ما زالت محفوظة؛ احذفها أو فعّل التأجير.');}
 if(tree&&(order.rental?.requested===true||order.equipment?.length)){
  const needs=progress.missing.some(item=>item.key==='services'),name=item=>ar?item.nameAr||item.name:item.name;
  // Codes match the Booking page cards: categories 04.02, 04.03… (MC is a real service, not a category) and their individual equipment 04.0X.01…
  // MC hosting is a real service of Step 3 (music.mcRequested has its own line there), so it is not part of the rental tree.
  const categories=bookingSections(order,rentals).rentals.filter(service=>service.id!=='mc'&&service.selectionField!=='music.mcRequested');let categoryNumber=1;
  const listed=new Set();
 for(const service of categories){
   const code=`04.${String(++categoryNumber).padStart(2,'0')}`;let itemNumber=0;
   const group=service.on?0:needs?1:2;
  service.equipment.forEach(item=>listed.add(item.id));
   lines.push({key:`service:${service.id}`,category:true,reviewValue:service.on,reviewPath:service.selectionField||'services',label:name(service),value:service.on?tr('Added','مضاف'):goalValue(null,ar),empty:!service.on,required:false,group,items:service.equipment.map(item=>({key:`equipment:${service.id}:${item.id}`,code:`${code}.${String(++itemNumber).padStart(2,'0')}`,reviewValue:item.quantity||null,reviewPath:'equipment',label:name(item),value:item.quantity?`× ${item.quantity}`:'—',stock:stockLabel(item,ar),empty:!item.quantity}))});
  }
 const missing=(order.equipment||[]).filter(item=>!listed.has(item.id));
 if(missing.length)lines.push({key:'service:unavailable',category:true,label:tr('Equipment to resolve','معدات تحتاج مراجعة'),empty:false,items:missing.map(item=>({key:`equipment:unavailable:${item.id}`,reviewPath:'equipment',reviewValue:item.quantity,label:item.name||item.id,value:`× ${item.quantity}`,stock:tr('No longer in catalogue — remove or replace','لم تعد في الكتالوج — احذفها أو استبدلها'),empty:false}))});
 }else if(goal.id==='rentals'&&order.equipment?.length)lines.push({key:'equipment',reviewValue:order.equipment,reviewPath:'equipment',label:ar?'المعدات':'Equipment',value:bookingFieldValue(order,'equipment',ar)});
 return {progress,lines:lines.map((line,index)=>({line,index})).sort((a,b)=>atomRank(a.line.key)-atomRank(b.line.key)||a.index-b.index).map(row=>row.line)};
}

// A submitted brief is immutable: only captured values, independent of today's
// catalog, stock, newly required fields or unselected services.
export function submittedSectionLines(order,goal,ar=false){
 const {progress,lines}=sectionLines(order,goal,ar);
 return {progress:{...progress,missing:[]},lines:lines.filter(line=>!line.empty).map(line=>({...line,required:false,group:0}))};
}
