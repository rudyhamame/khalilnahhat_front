export const GOOGLE_SIGN_IN_ORIGIN='https://djkhalilnahhat.ca';

export function isLocalSignInOrigin(value){
 try{
  const url=new URL(value);
  if(url.origin!==value||!['http:','https:'].includes(url.protocol))return false;
  if(['localhost','[::1]'].includes(url.hostname))return true;
  const parts=url.hostname.split('.').map(Number);
  if(parts.length!==4||parts.some(part=>!Number.isInteger(part)||part<0||part>255))return false;
  return parts[0]===127||parts[0]===10||(parts[0]===192&&parts[1]===168)||(parts[0]===172&&parts[1]>=16&&parts[1]<=31);
 }catch{return false;}
}

export function readGoogleBridgeRequest(hash){
 const params=new URLSearchParams(hash.replace(/^#/,''));
 const origin=params.get('origin'),state=params.get('state'),nonce=params.get('nonce'),clientId=params.get('clientId');
 if(!isLocalSignInOrigin(origin)||!/^\w{64}$/.test(state||'')||!/^\w{64}$/.test(nonce||'')||!/^[\w-]+\.apps\.googleusercontent\.com$/.test(clientId||''))return null;
 return {origin,state,nonce,clientId,ar:params.get('lang')==='ar'};
}

export function isGoogleBridgeResponse(event,pending){
 const data=event.data;
 return Boolean(pending&&event.origin===GOOGLE_SIGN_IN_ORIGIN&&event.source===pending.popup&&data?.type==='echo:google-credential'&&data.state===pending.state&&data.nonce===pending.nonce&&typeof data.credential==='string'&&data.credential.length>0&&data.credential.length<=16000);
}
