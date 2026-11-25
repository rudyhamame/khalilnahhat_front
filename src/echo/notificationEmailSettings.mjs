import {emailDetailLabel,missingEmailDetails,templateSegments} from './emailTemplateEditor.js';

export const editableEmail=item=>({revision:item.revision,enabled:item.enabled,subject:item.subject,body:item.body,imageUrl:item.imageUrl||'',leadHours:item.leadHours??null});
export const emailHasChanges=(item,draft)=>Boolean(item&&draft&&Object.entries(editableEmail(item)).some(([key,value])=>draft[key]!==value));
export function filterNotificationEmails(items,drafts,{query='',group='all',status='all'}={}){
 const words=query.trim().toLowerCase().split(/\s+/).filter(Boolean);
 return items.filter(item=>{
  const draft=drafts[item.id]||item;
  return (group==='all'||item.group===group)&&(status==='all'||(status==='on'&&draft.enabled)||(status==='off'&&!draft.enabled)||(status==='unsaved'&&emailHasChanges(item,draft)))&&words.every(word=>`${item.label} ${item.group} ${item.recipient} ${item.when}`.toLowerCase().includes(word));
 });
}
export function validateEmailDraft(item,draft){
 if(!draft)return {};
 const errors={};
 if(!draft.subject.trim()||draft.subject.length>200||/[\r\n]/.test(draft.subject))errors.subject='Write a subject on one line, up to 200 characters.';
 if(!draft.body.trim()||draft.body.length>12000)errors.body='Write a message of up to 12,000 characters.';
 const missing=missingEmailDetails(draft.body,item.required||[]);
 if(missing.length)errors.body=`Add ${missing.map(emailDetailLabel).join(', ')} to the message.`;
 for(const field of ['subject','body']){
  const parts=templateSegments(draft[field]);
  const unknown=parts.find(part=>part.variable&&!(item.variables||[]).includes(part.variable));
  if(unknown)errors[field]=`“${emailDetailLabel(unknown.variable)}” is not available for this email. Choose a detail from Personalize.`;
  else if(parts.some(part=>part.text&&/\{\{|\}\}/.test(part.text)))errors[field]='An automatic detail is incomplete. Remove it and insert it again from Personalize.';
 }
 if((item.leadHours!=null)!==(draft.leadHours!==null)||(draft.leadHours!==null&&(typeof draft.leadHours!=='number'||!Number.isFinite(draft.leadHours)||draft.leadHours<.25||draft.leadHours>720)))errors.leadHours='Choose a reminder time between 0.25 and 720 hours before the event.';
 if(draft.imageUrl){
  try{const url=new URL(draft.imageUrl);if(url.protocol!=='https:'||url.username||url.password||draft.imageUrl.length>2048)throw new Error();}
  catch{errors.imageUrl='Choose a valid HTTPS photo from the gallery.';}
 }
 return errors;
}
export function reminderTiming(hours){
 if(hours===null)return 'When the event happens';
 if(typeof hours!=='number'||!Number.isFinite(hours))return 'Choose a reminder time';
 if(hours<1)return `${Math.round(hours*60)} minutes before`;
 if(hours%24===0)return `${hours/24} day${hours===24?'':'s'} before`;
 return `${hours} hour${hours===1?'':'s'} before`;
}
