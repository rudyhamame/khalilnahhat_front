import {uuid} from './uuid.js';
export const bookingConversationKey=(owner,id)=>`echo-booking-conversation:v1:${owner}:${id}`;
const partId=(id,part)=>part?`${id.slice(0,-12)}${((BigInt('0x'+id.slice(-12))+BigInt(part))%(1n<<48n)).toString(16).padStart(12,'0')}`:id;
// Keep all text, splitting long recaps into valid messages with stable retry IDs.
function normalizeMessages(messages){
 return messages.flatMap(message=>{
  if(typeof message?.content!=='string'||!message.content.trim())return [];
  const id=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(message.id||'')?message.id:uuid(),parts=[];let remaining=message.content,part=0;
  while(remaining){
   let end=Math.min(4000,remaining.length);if(end<remaining.length&&/[\uD800-\uDBFF]/.test(remaining[end-1]))end--;
   const content=remaining.slice(0,end);remaining=remaining.slice(end);
   if(!content.trim())continue;
   const next={...message,id:partId(id,part++),content};
   for(const key of ['segmentId','fieldPath','section','face'])if(next[key]==null)delete next[key];
   parts.push(next);
  }
  return parts;
 });
}
// Only unacknowledged text is cached. The account + draft key keeps clients and bookings isolated.
export function createBookingConversationRecorder(write,id=uuid(),{owner,storage:providedStorage}={}){
 let storage=providedStorage;try{storage??=globalThis.localStorage;}catch{/* Storage is optional. */}
 const key=owner?bookingConversationKey(owner,id):null;
 let saved;try{saved=key?JSON.parse(storage?.getItem(key)||'null'):null;}catch{/* Ignore corrupt cache. */}
 const pending=normalizeMessages(Array.isArray(saved?.pending)?saved.pending:[]);
 const known=new Set([...(Array.isArray(saved?.knownIds)?saved.knownIds:[]),...pending.map(message=>message.id)]);
 const acknowledged=new Set();
 const persist=()=>{try{
  if(!key)return;
  // Another tab may have queued messages while this writer was awaiting the API.
  const cached=JSON.parse(storage?.getItem(key)||'null'),queued=new Set(pending.map(message=>message.id));
  for(const message of normalizeMessages(Array.isArray(cached?.pending)?cached.pending:[]))if(!acknowledged.has(message.id)&&!queued.has(message.id)){pending.push(message);queued.add(message.id);}
  for(const messageId of Array.isArray(cached?.knownIds)?cached.knownIds:[])known.add(messageId);
  storage?.setItem(key,JSON.stringify({pending,knownIds:[...known]}));
 }catch{/* Network saves still work if browser storage is unavailable. */}};
 let tail=Promise.resolve();
 const flush=()=>{
  tail=tail.catch(()=>{}).then(async()=>{
   persist();
   while(pending.length){
    // Two 4,000-character messages stay within keepalive's 64 KB limit, even as UTF-8.
    const messages=pending.slice(0,2);await write({id,consent:true,messages});for(const message of messages)acknowledged.add(message.id);pending.splice(0,messages.length);persist();
   }
   return {draftId:id,messageIds:[...known]};
  });return tail;
 };
 return {id,
  save(messages){
   const queued=new Set(pending.map(message=>message.id));
   for(const message of normalizeMessages(messages)){if(!known.has(message.id)&&!queued.has(message.id)){pending.push(message);queued.add(message.id);}known.add(message.id);}
   persist();return flush();
  },
  pendingMessages:()=>pending.map(message=>({...message})),
  remember(messages){for(const message of normalizeMessages(messages))known.add(message.id);persist();},
  retry:flush,
 };
}
