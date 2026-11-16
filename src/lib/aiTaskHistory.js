import {aiFields} from './eventOrderCore.mjs';
// Draft-specific browser history. Another account or draft never inherits it.
export function aiTaskHistoryKey(owner,draftId){return owner&&draftId?`echo-ai-tasks:v1:${encodeURIComponent(owner)}:${encodeURIComponent(draftId)}`:null;}
export function readAiTaskHistory(key,storage){
 if(!key)return [];
 try{
  const rows=JSON.parse((storage||localStorage).getItem(key)||'[]');
  if(!Array.isArray(rows))return [];
  const seen=new Set();
  return rows.map(row=>row&&Array.isArray(row.venueFields)?{...row,venueFields:row.venueFields.filter(change=>aiFields.some(field=>field.key===change.path))}:row).filter(row=>{
   if(row?.path&&!aiFields.some(field=>field.key===row.path))return false;
   if(!row||typeof row.id!=='string'||typeof row.label!=='string'||!row.label.trim()||row.label.length>300||![null,true,false].includes(row.confirmed)||seen.has(row.id))return false;
   seen.add(row.id);return true;
  });
 }catch{return [];}
}
export function saveAiTaskHistory(key,tasks,storage){
 if(!key)return true;
 try{(storage||localStorage).setItem(key,JSON.stringify(tasks));return true;}catch{return false;}
}
