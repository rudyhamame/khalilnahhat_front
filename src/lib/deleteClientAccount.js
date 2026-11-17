export async function deleteClientAccount({user,token,request,confirm,storage}){
 const accepted=await confirm('Permanently delete your profile, saved drafts and Echo conversations? Submitted bookings remain with the Echo team and are not cancelled.',{title:'Delete your account?',confirmLabel:'Delete account'});
 if(!accepted)return false;
 const result=await request('/auth/account',{method:'DELETE',token,confirmedDelete:true,body:{confirmation:'DELETE'}});
 if(result.deleted!==true)throw new Error('Account deletion was not confirmed. Please retry.');
 const owner=String(user.id||user._id||user.username);
 const prefixes=[`echo-event-order:v1:${owner}`,`echo-booking-conversation:v1:${owner}:`,`echo-ai-tasks:v1:${encodeURIComponent(owner)}:`,`echo-atom-review:v1:${owner}:`,`echo-booking-submission:v1:${owner}:`];
 try{
  const keys=Array.from({length:storage.length},(_,index)=>storage.key(index));
  for(const key of keys)if(key&&(prefixes.some(prefix=>key===prefix||key.startsWith(prefix.endsWith(':')?prefix:prefix+':'))||key===`echo-quote-draft:${owner}`))storage.removeItem(key);
  for(const key of ['khalil-auth-token','khalil-auth-return','echo-quote-cart'])storage.removeItem(key);
 }catch{/* The deleted account's server sessions are already invalidated. */}
 return true;
}
