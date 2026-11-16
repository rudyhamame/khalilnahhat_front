import {bookingFieldValue} from './bookingPresentation.js';
import {aiFields,getPath,isAnswered,fieldName} from './eventOrderCore.mjs';

// Presentation only (front end). The shared rulebook, eventOrderCore.mjs, stays identical in both repositories.
export function bookingDraftSummary(order,ar=false){
 return aiFields.filter(field=>!field.private&&!field.key.startsWith('planning.')&&field.key!=='additional.voucherCode'&&field.type!=='coordinate')
  .flatMap(field=>{const value=getPath(order,field.key);if(!isAnswered(value)||value===false&&field.type!=='boolean')return[];const content=bookingFieldValue(order,field.key,ar,value);if(!content)return[];const label=fieldName(field.key,ar);return[`${label}: ${content}`];})
  .slice(0,18).map(line=>`• ${line}`).join('\n');
}
