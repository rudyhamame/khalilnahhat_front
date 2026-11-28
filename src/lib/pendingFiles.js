// Booking photos/documents stay in THIS browser (IndexedDB, with a memory fallback) until the booking is submitted; only then are they uploaded.
// A staged file appears in the order as {url:'pending:<sha256>',name,comment,sha256,size}; the server draft never receives it.
const mem=new Map();let opened;
const open=()=>opened||(opened=new Promise((resolve,reject)=>{const request=indexedDB.open('echo-pending-files',1);request.onupgradeneeded=()=>request.result.createObjectStore('f');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);}));
const run=async(mode,work)=>{const db=await open();return new Promise((resolve,reject)=>{const request=work(db.transaction('f',mode).objectStore('f'));request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});};
export const isPending=item=>typeof item?.url==='string'&&item.url.startsWith('pending:');
export const pendingUrl=sha256=>`pending:${sha256}`;
export async function stageFile(sha256,file){mem.set(sha256,file);try{await run('readwrite',store=>store.put(file,sha256));}catch{/* Memory copy still works for this page visit. */}}
export async function stagedFile(sha256){if(mem.has(sha256))return mem.get(sha256);try{return await run('readonly',store=>store.get(sha256))||null;}catch{return null;}}
export async function unstageFile(sha256){mem.delete(sha256);try{await run('readwrite',store=>store.delete(sha256));}catch{/* Nothing to clean. */}}
// The order as the server may see it: staged files are left out.
export function withoutPending(order){
 const references=order?.references;if(!references||!['photos','files'].some(field=>references[field]?.some?.(isPending)))return order;
 return {...order,references:{...references,...Object.fromEntries(['photos','files'].map(field=>[field,(references[field]||[]).filter(item=>!isPending(item))]))}};
}
// Submit time: upload every staged file and return the list with real URLs.
export async function uploadStaged(items,kind,token){
 const next=[];
 for(const item of items){
  if(!isPending(item)){next.push(item);continue;}
  const blob=await stagedFile(item.sha256);
  if(!blob)throw new Error(`“${item.name}” is no longer stored in this browser. Remove it and add it again.`);
  const {uploadEventFile}=await import('./api.js');
  const {url,name,sha256}=await uploadEventFile(new File([blob],item.name,{type:blob.type}),kind,token);
  if(sha256&&sha256!==item.sha256)throw new Error(`“${item.name}” could not be verified. Please try again.`);
  next.push({url,name,comment:item.comment||'',sha256:item.sha256,size:item.size});
  // The staged copy stays until the booking is really sent (the caller removes it then): a failed or refused step after the upload must not leave the order pointing at a file that is gone.
 }
 return next;
}
