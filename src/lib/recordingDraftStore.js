import {apiRequest} from './api';
let database;
const queues=new Map();
function openDatabase(){
 if(!database)database=new Promise((resolve,reject)=>{
  const request=indexedDB.open('echo-recording-drafts',1);
  request.onupgradeneeded=()=>{request.result.createObjectStore('drafts');request.result.createObjectStore('audio');};
  request.onsuccess=()=>{const db=request.result;db.onversionchange=()=>{db.close();database=null;};resolve(db);};
  request.onerror=()=>reject(request.error||new Error('Browser draft storage is unavailable.'));
 }).catch(error=>{database=null;throw error;});
 return database;
}
const queue=(key,operation)=>{
 const pending=(queues.get(key)||Promise.resolve()).catch(()=>{}).then(operation);
 queues.set(key,pending);pending.finally(()=>{if(queues.get(key)===pending)queues.delete(key);}).catch(()=>{});return pending;
};
function transactionDone(transaction){return new Promise((resolve,reject)=>{transaction.oncomplete=resolve;transaction.onerror=()=>reject(transaction.error);transaction.onabort=()=>reject(transaction.error||new Error('Browser draft save was interrupted.'));});}
export async function recordingDraftOwner(token){
 const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(value=>value.toString(16).padStart(2,'0')).join('');
 const cacheKey=`echo-recording-owner:${hash}`;
 try{const cached=localStorage.getItem(cacheKey);if(cached)return cached;}catch{}
 const {user}=await apiRequest('/auth/me',{token});const owner=user?.id||user?._id||user?.externalId;
 if(!owner)throw Error('Could not identify the owner of this browser draft.');
 try{localStorage.setItem(cacheKey,String(owner));}catch{}
 return String(owner);
}
export function saveRecordingDraft(key,payload,audio){
 return queue(key,async()=>{
  const db=await openDatabase(),transaction=db.transaction(['drafts','audio'],'readwrite'),done=transactionDone(transaction);
  const pending=audio?{version:audio.version,url:audio.url,exportFormat:audio.exportFormat,audioMetadata:audio.audioMetadata,uploaded:audio.uploaded||null}:null;
  const drafts=transaction.objectStore('drafts'),files=transaction.objectStore('audio'),previous=drafts.get(key);
  previous.onsuccess=()=>{
   const old=previous.result?.audio;
   if(old&&old.version!==audio?.version){files.delete([key,old.version]);files.delete(key);}
  };
  drafts.put({...payload,audio:pending,updatedAt:Date.now()},key);
  if(audio){
   const existing=files.getKey([key,audio.version]);
   existing.onsuccess=()=>{if(existing.result===undefined)files.put({version:audio.version,file:audio.file},[key,audio.version]);};
  }
  await done;try{localStorage.removeItem(`echo-recording-saved:${key}`);}catch{}
 });
}
export function loadRecordingDraft(key){
 return queue(key,async()=>{
  try{if(localStorage.getItem(`echo-recording-saved:${key}`))return null;}catch{}
  const db=await openDatabase(),transaction=db.transaction(['drafts','audio'],'readonly'),done=transactionDone(transaction);
  const read=(store,id)=>new Promise((resolve,reject)=>{const request=transaction.objectStore(store).get(id);request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});
  // Read the small form first; audio is stored separately and fetched only when restoring.
  const reading=(async()=>{
   const draft=await read('drafts',key);if(!draft)return null;
   if(draft.audio){
    const audio=await read('audio',[key,draft.audio.version])||await read('audio',key);
    if(!audio?.file||audio.version!==draft.audio.version)throw Error('The saved audio draft could not be restored.');
    draft.audio.file=audio.file;
   }
   return draft;
  })();
  const [draft]=await Promise.all([reading,done]);
  return draft;
 });
}
export function deleteRecordingDraft(key){
 return queue(key,async()=>{
  // A confirmed database save must not reopen as an unsaved new recording if cleanup fails.
  try{localStorage.setItem(`echo-recording-saved:${key}`,'true');}catch{}
  const db=await openDatabase(),transaction=db.transaction(['drafts','audio'],'readwrite'),done=transactionDone(transaction);
  transaction.objectStore('drafts').delete(key);transaction.objectStore('audio').delete(key);transaction.objectStore('audio').delete(IDBKeyRange.bound([key],[key,'\uffff']));await done;try{localStorage.removeItem(`echo-recording-saved:${key}`);}catch{}
 });
}
export function restoreRecordingDraft(saved){
 const editor=structuredClone(saved.editor);
 let audio=null;
 if(saved.audio){
  const url=URL.createObjectURL(saved.audio.file),previous=editor.value.audioUrl;
  audio={...saved.audio,url};editor.value.audioUrl=url;
 }
 const rebind=value=>{
  if(value===saved.editor.value.audioUrl&&audio)return audio.url;
  if(Array.isArray(value))return value.map(rebind);
  if(value&&typeof value==='object')return Object.fromEntries(Object.entries(value).map(([key,entry])=>[key,rebind(entry)]));
  return value;
 };
 return {...saved,editor,audio,completionReport:rebind(saved.completionReport)};
}
