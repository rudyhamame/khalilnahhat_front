// Durable browser outbox. A chunk is removed only after the server acknowledges it.
export class RecordingOutbox {
 async db(){return new Promise((resolve,reject)=>{const r=indexedDB.open('echo-live-recordings',1);r.onupgradeneeded=()=>{r.result.createObjectStore('sessions',{keyPath:'id'});const chunks=r.result.createObjectStore('chunks',{keyPath:'key'});chunks.createIndex('session','id');};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
 async transaction(names,write,work){const db=await this.db();return new Promise((resolve,reject)=>{const tx=db.transaction(names,write?'readwrite':'readonly');let value;tx.oncomplete=()=>{db.close();resolve(value);};tx.onerror=tx.onabort=()=>{db.close();reject(tx.error||new Error('Local recording storage failed.'));};work(tx,v=>{value=v;});});}
 touch(id){return this.transaction(['sessions'],true,tx=>{const s=tx.objectStore('sessions'),r=s.get(id);r.onsuccess=()=>{if(r.result&&!r.result.stopped)s.put({...r.result,updatedAt:Date.now()});};});}
 put(session){return this.transaction(['sessions'],true,tx=>tx.objectStore('sessions').put(session));}
 sessions(){return this.transaction(['sessions'],false,(tx,done)=>{const r=tx.objectStore('sessions').getAll();r.onsuccess=()=>done(r.result);});}
 append(id,bytes,mime){return this.transaction(['sessions','chunks'],true,tx=>{const store=tx.objectStore('sessions'),r=store.get(id);r.onsuccess=()=>{const session=r.result;if(!session){tx.abort();return;}if(session.bytes+bytes.byteLength>4*1024**3){tx.abort();return;}const sequence=session.count++;session.bytes+=bytes.byteLength;session.updatedAt=Date.now();tx.objectStore('chunks').put({key:id+':'+String(sequence).padStart(8,'0'),id,sequence,bytes,mime});store.put(session);};});}
 next(id){return this.transaction(['chunks'],false,(tx,done)=>{const r=tx.objectStore('chunks').index('session').openCursor(IDBKeyRange.only(id));r.onsuccess=()=>done(r.result?.value||null);});}
 ack(key){return this.transaction(['chunks'],true,tx=>tx.objectStore('chunks').delete(key));}
 remove(id){return this.transaction(['sessions'],true,tx=>tx.objectStore('sessions').delete(id));}
 async markStopped(id,complete){const sessions=await this.sessions(),s=sessions.find(s=>s.id===id);if(s)await this.put({...s,stopped:true,complete,updatedAt:Date.now()});}
}
export const recordingMime=Recorder=>['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','audio/webm;codecs=opus'].find(type=>Recorder.isTypeSupported(type));
const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
export async function drainRecording({id,store,upload,finish,onStatus=()=>{},attempts=1}){
 let failed=0;
 while(true){
  try{
   const chunk=await store.next(id);
   if(chunk){await upload(id,chunk.sequence,chunk.bytes,chunk.mime);await store.ack(chunk.key);failed=0;continue;}
   const session=(await store.sessions()).find(s=>s.id===id);
   if(session?.stopped){await finish(id,{chunks:session.count,complete:session.complete});await store.remove(id);onStatus('Recording uploaded. Preparing the archive.');}
   return;
  }catch(error){if(++failed>=attempts)throw error;await delay(Math.min(1000*2**failed,10000));}
 }
}
export async function startDirectRecording({id,tracks,upload,finish,onStatus=()=>{},store=new RecordingOutbox(),Recorder=globalThis.MediaRecorder,Stream=globalThis.MediaStream}){
 if(!Recorder||!globalThis.indexedDB&&store instanceof RecordingOutbox)throw new Error('This browser cannot save a live recording. Use a browser with MediaRecorder and local storage.');
 const mime=recordingMime(Recorder);if(!mime)throw new Error('This browser has no supported recording format.');
 const recorder=new Recorder(new Stream(tracks),{mimeType:mime,videoBitsPerSecond:(tracks.find(t=>t.kind==='video')?.getSettings?.().height||720)>=1080?6000000:3500000,audioBitsPerSecond:192000});
 await store.put({id,count:0,bytes:0,stopped:false,complete:false,updatedAt:Date.now()});
 let writes=Promise.resolve(),draining=null,writeError=null,stopping=false;
 const drain=()=>{if(!draining)draining=drainRecording({id,store,upload,finish,onStatus}).catch(error=>{onStatus('Recording upload paused. Data is kept on this device; keep this page open to retry.');throw error;}).finally(()=>{draining=null;});return draining;};
 recorder.ondataavailable=event=>{
  if(!event.data?.size)return;
  writes=writes.then(async()=>{for(let offset=0;offset<event.data.size;offset+=8*1024**2)await store.append(id,await event.data.slice(offset,offset+8*1024**2).arrayBuffer(),recorder.mimeType);}).catch(error=>{writeError=error;onStatus('Recording stopped because local storage failed. Received media is retained.');if(recorder.state!=='inactive')recorder.stop();});
  void writes.then(()=>drain()).catch(()=>{});
 };
 let stopped;const stoppedPromise=new Promise(resolve=>{stopped=resolve;});recorder.onstop=()=>stopped();recorder.onerror=()=>{writeError=new Error('The device interrupted recording.');if(recorder.state!=='inactive')recorder.stop();else stopped();};
 recorder.start(4000);
 const timer=setInterval(()=>{void writes.then(async()=>{await store.touch?.(id);return drain();}).catch(()=>{});},5000);
 return {async stop(complete=true){
  if(stopping)return;stopping=true;clearInterval(timer);
  if(recorder.state!=='inactive')recorder.stop();
  await stoppedPromise;await writes;await draining?.catch(()=>{});
  await store.markStopped(id,complete&&!writeError);
  try{await drainRecording({id,store,upload,finish,onStatus,attempts:4});}
  catch(error){throw new Error('Recording uploads are pending on this device. Reopen Echo Studio while signed in to retry.',{cause:error});}
  if(writeError)throw writeError;
 }};
}
export async function recoverRecordings({upload,finish,onStatus,store=new RecordingOutbox()}){
 for(const session of await store.sessions()){
  // Do not finalize a capture owned by another open tab.
  if(!session.stopped&&Date.now()-session.updatedAt<300000)continue;
  if(!session.stopped)await store.markStopped(session.id,false);
  try{await drainRecording({id:session.id,store,upload,finish,onStatus,attempts:2});}catch{onStatus?.('A previous recording is waiting to upload from this device. Keep Echo Studio open to retry.');}
 }
}
