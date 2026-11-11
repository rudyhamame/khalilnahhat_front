import {fields,getPath,isAnswered} from './eventOrderCore.mjs';
// A visitor can fill in the booking before signing in. When they sign in or sign up, their guest draft is merged into the
// account draft: answers already on the account win, and anything the account left empty is filled from the guest draft.
export function mergeGuestDraft(account,guest){
 const next=JSON.parse(JSON.stringify(account));
 const put=(path,value)=>{const keys=path.split('.');let target=next;for(const key of keys.slice(0,-1))target=target[key]||={};target[keys.at(-1)]=value;};
 for(const field of fields){
  if(field.key.startsWith('customer.'))continue; // the account supplies the personal details
  const value=getPath(guest,field.key);
  if(isAnswered(value)&&!isAnswered(getPath(next,field.key)))put(field.key,JSON.parse(JSON.stringify(value)));
 }
 const known=new Set((next.equipment||[]).map(item=>item.id));
 next.equipment=[...(next.equipment||[]),...(guest?.equipment||[]).filter(item=>item&&!known.has(item.id))];
 return next;
}
