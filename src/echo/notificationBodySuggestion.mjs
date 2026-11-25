import {templateSegments} from './emailTemplateEditor.js';
import {validateEmailDraft} from './notificationEmailSettings.mjs';

// Older email services already support AI polishing. Use it only when the
// notification-specific route is absent, and review the same validated body.
export async function suggestNotificationBody(item,draft,{request,token}){
 let result;
 const source=draft.body.trim()?draft.body:item.body;
 try{
  result=await request(`/admin/notifications/emails/${encodeURIComponent(item.id)}/suggest-body`,{token,method:'POST',body:{subject:draft.subject,body:draft.body}});
 }catch(error){
  if(error.status!==404)throw error;
  result=await request('/admin/ai/email-polish',{token,method:'POST',body:{subject:draft.subject||item.subject,text:source}});
 }
 const body=typeof result?.body==='string'?result.body.trim():'';
 const details=value=>new Set(templateSegments(value).map(part=>part.variable).filter(Boolean));
 const present=details(body),keep=details(source);
 if(!body||validateEmailDraft(item,{...draft,body}).body||[...keep].some(key=>!present.has(key))||/<\/?[a-z][^>]*>/i.test(body)||/^```/m.test(body)){
  throw new Error('AI did not return a valid message with all automatic details. Your draft is unchanged. Try again.');
 }
 return {body};
}
