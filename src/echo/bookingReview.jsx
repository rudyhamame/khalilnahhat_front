import {getPath,isAnswered,fieldName} from '../lib/eventOrderCore.mjs';
import {eventTypeLabel} from '../lib/eventTypeLabel';
import {bookingSections} from '../lib/bookingSections';
import {goalFields,goalProgress,goalValue} from '../lib/bookingGoals';

// The Booking review: every section's data atoms, grouped Entered / Needs attention / Optional. Used by Echo Smart Cart (Echo AI page),
// the concept map and the client dashboard's Booking draft, so all three show exactly the same thing.
// The DJ service belongs to its own section, so it is left out of Rental services & equipment.
export const draftValue=(order,key)=>key==='services'?(order.services||[]).filter(id=>id!=='dj'):getPath(order,key);
// The data atoms of one section, grouped Entered / Needs attention / Optional. Booking review and the concept map both render exactly this.
export const AtomRow=({line,tr})=><><small className="ea-data-row" data-field={line.key} data-empty={line.empty?'':undefined}><b>{line.label}</b><span className="ea-data-value">{line.value}</span></small>{line.items?.length>0&&<table className="ea-equipment-table"><thead><tr><th scope="col">{tr('Equipment','المعدات')}</th><th scope="col">{tr('Qty','الكمية')}</th></tr></thead><tbody>{line.items.map(item=><tr key={item.key} data-field={item.key} data-empty={item.empty?'':undefined}><td>{item.label}</td><td>{item.value}</td></tr>)}</tbody></table>}</>;
export function AtomGroups({lines,progress,tr,wrap=null,atoms=false}){
 const groupOf=line=>line.group??(!line.empty?0:line.required?1:2);
 if(atoms&&wrap)return <>{lines.map(line=>{const group=groupOf(line);return wrap(<span className="ea-group" data-group={['entered','attention','optional'][group]}><AtomRow line={line} tr={tr}/></span>,group,line.key);})}</>;
 const groups=[[null,lines.filter(line=>groupOf(line)===0)],[tr('Needs attention','يحتاج انتباهك'),lines.filter(line=>groupOf(line)===1)],[tr('Optional','اختياري'),lines.filter(line=>groupOf(line)===2)]];
 const boxed=(node,group,key=group)=>wrap?wrap(node,group,key):node;
 return <>{groups.map(([title,rows],group)=>rows.length>0&&boxed(<span className="ea-group" data-group={['entered','attention','optional'][group]} key={group}>{title&&<em>{title}</em>}{!title&&lines.some(line=>groupOf(line)!==0)&&<em>{tr('Entered','تم إدخاله')}</em>}{rows.map(line=><AtomRow key={line.key} line={line} tr={tr}/>)}</span>,group,group))}{!lines.length&&boxed(<small className="ea-step-empty">{progress.missing.length?tr(`${progress.missing.length} to fill in`,`${progress.missing.length} للتعبئة`):tr('Optional','اختياري')}</small>,1,'empty')}</>;
}
// Short "label: value" lines shown for a section in the live summary (answered fields first, then what is still missing).
// While the service catalog is still loading, the Rental section shows one "Loading" row instead of flat fields that become a tree a moment later.
export function sectionLines(order,goal,ar,rentals=[],catalogLoading=false){
 const progress=goalProgress(order,goal),tr=(en,arabic)=>ar?arabic:en;
 const tree=goal.id==='rentals'&&rentals.length>0,loading=goal.id==='rentals'&&catalogLoading&&!rentals.length;
 if(loading)return {progress,lines:[{key:'services',label:ar?'خدمات التأجير':'Rental services',value:ar?'جارٍ التحميل…':'Loading…',empty:true,required:false,group:2}]};
 // Rental services & equipment is listed as a tree: every service (MC included) with all of its equipment under it.
 const all=goalFields(goal).filter(field=>(!field.gate||getPath(order,field.gate)===true)&&!(tree&&['services','music.mcRequested','rental.requested','music.djMc'].includes(field.key)));
 // Every field of the section is listed with its value; fields not answered yet read "Not set yet".
 const lines=all.map(field=>({key:field.key,label:(fieldName(field.key,ar)||(ar?field.ar||field.label:field.label)).replace(/\s*[(（](?:optional|only if|اختياري)[^)）]*[)）]/i,''),value:field.key==='event.type'?eventTypeLabel(order.event?.type,ar)||goalValue(null,ar):goalValue(draftValue(order,field.key),ar),empty:!isAnswered(draftValue(order,field.key)),required:progress.missing.some(item=>item.key===field.key)}));
 if(tree){
  const needs=progress.missing.some(item=>item.key==='services'),name=item=>ar?item.nameAr||item.name:item.name;
  for(const service of bookingSections(order,rentals).rentals){
   const group=service.on?0:needs?1:2;
   lines.push({key:`service:${service.id}`,label:name(service),value:service.on?tr('Added','مضاف'):goalValue(null,ar),empty:!service.on,required:false,group,items:service.equipment.map(item=>({key:`equipment:${service.id}:${item.id}`,label:name(item),value:item.quantity?`× ${item.quantity}`:'—',empty:!item.quantity}))});
  }
 }else if(goal.id==='rentals'&&order.equipment?.length)lines.push({key:'equipment',label:ar?'المعدات':'Equipment',value:goalValue(order.equipment,ar)});
 return {progress,lines};
}
