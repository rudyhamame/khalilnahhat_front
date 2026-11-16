import {aiFields,getPath,isAnswered,fieldName} from './eventOrderCore.mjs';
import {eventTypeLabel} from './eventTypeLabel.js';

// Presentation only (front end). The shared rulebook, eventOrderCore.mjs, stays identical in both repositories.
export function bookingDraftSummary(order,ar=false){
 const describe=(field,value)=>{
  if(field.type==='equipment')return value.map(item=>`${item.name||item.id}${item.quantity>1?` × ${item.quantity}`:''}`).join(', ');
  if(field.key==='event.type')return eventTypeLabel(value,ar);
  if(field.type==='boolean')return value?(ar?'نعم':'Yes'):(ar?'لا':'No');
  if(field.key==='services')return value.map(item=>({dj:ar?'دي جي خليل':'DJ Khalil',mc:ar?'تقديم الحفل':'MC hosting'}[item]||item)).join(', ');
  if(field.type==='pairs')return value.map(item=>item.dialect?`${item.language} — ${item.dialect}`:item.language).join(', ');
  if(field.type==='songs')return value.map(item=>typeof item==='string'?item:`${item.phase?item.phase+': ':''}${[item.song,item.artist].filter(Boolean).join(' — ')}${item.link?' ('+item.link+')':''}`).join(', ');
  if(Array.isArray(value))return value.join(', ');
  return String(value).replace(/\s+/g,' ').trim().slice(0,180);
 };
 return aiFields.filter(field=>!field.private&&!field.key.startsWith('planning.')&&field.key!=='additional.voucherCode'&&field.type!=='coordinate')
  .flatMap(field=>{const value=getPath(order,field.key);if(!isAnswered(value)||value===false&&field.type!=='boolean')return[];const content=describe(field,value);if(!content)return[];const label=fieldName(field.key,ar);return[`${label}: ${content}`];})
  .slice(0,18).map(line=>`• ${line}`).join('\n');
}
