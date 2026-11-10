// Each part is closed on disk before its manifest advances. Recovery also scans
// parts, so a crash between the part write and manifest write loses no closed part.
async function writeFile(directory,name,data){
 const file=await directory.getFileHandle(name,{create:true}),writer=await file.createWritable();
 try{await writer.write(data);await writer.close();}catch(error){await writer.abort().catch(()=>{});throw error;}
}
const partName=sequence=>String(sequence).padStart(8,'0')+'.part';
export class DiskRecordingStore {
 constructor(directory){this.directory=directory;this.entries=new Map();}
 async put(session){
  const directory=await this.directory.getDirectoryHandle(session.id,{create:true});
  await writeFile(directory,'recording.json',JSON.stringify(session));this.entries.set(session.id,{directory,session:{...session},chain:Promise.resolve()});
 }
 // One manifest write at a time: appends and upload acks share recording.json.
 save(entry){const run=entry.chain.then(()=>writeFile(entry.directory,'recording.json',JSON.stringify(entry.session)));entry.chain=run.catch(()=>{});return run;}
 async append(id,bytes,mime){
  const entry=this.entries.get(id);if(!entry)throw new Error('Recording folder is unavailable.');
  await writeFile(entry.directory,partName(entry.session.count),bytes);
  const session={...entry.session,count:entry.session.count+1,bytes:entry.session.bytes+bytes.byteLength,mime,updatedAt:Date.now()};
  entry.session=session;await this.save(entry);
 }
 async markStopped(id,complete){
  const entry=this.entries.get(id);if(!entry)return;
  entry.session={...entry.session,stopped:true,complete,updatedAt:Date.now()};
  await this.save(entry);
 }
 async touch(){}
 // Upload queue for the server archive: parts stay on disk; `uploaded` counts acknowledged parts.
 async next(id){
  const entry=this.entries.get(id),n=entry?.session.uploaded||0;if(!entry||n>=entry.session.count)return null;
  const file=await(await entry.directory.getFileHandle(partName(n))).getFile();
  return {key:id+'\n'+n,id,sequence:n,bytes:await file.arrayBuffer(),mime:entry.session.mime};
 }
 async setUploaded(id,n){const entry=this.entries.get(id);if(!entry)return;const uploaded=Math.min(Math.max(0,Number(n)||0),entry.session.count);if(uploaded!==(entry.session.uploaded||0)){entry.session={...entry.session,uploaded};await this.save(entry);}}
 // Explicit user action only: deletes the saved parts of one recording from the folder.
 async purge(id){await this.directory.removeEntry(id,{recursive:true});this.entries.delete(id);}
 async ack(key){
  const [id,n]=key.split('\n'),entry=this.entries.get(id);if(!entry)return;
  entry.session={...entry.session,uploaded:Math.max(entry.session.uploaded||0,Number(n)+1)};await this.save(entry);
 }
 async sessions(){return [...this.entries.values()].map(entry=>entry.session);}
 async recover(){
  for await(const directory of this.directory.values()){
   if(directory.kind!=='directory')continue;
   let session;
   try{session=JSON.parse(await(await(await directory.getFileHandle('recording.json')).getFile()).text());}catch{continue;}
   if(!session?.id||session.id!==directory.name)continue;
   // Local-file sessions carry a format and filename; server-upload sessions carry neither.
   if(session.format!==undefined&&(!['landscape','portrait'].includes(session.format)||!/^Echo-live-[\w.-]+\.(webm|mp4)$/.test(session.filename)))continue;
   const parts=[];for await(const file of directory.values())if(file.kind==='file'&&/^\d{8}\.part$/.test(file.name))parts.push(file.name);
   parts.sort();if(!parts.length)continue;
   if(parts.some((name,index)=>name!==partName(index)))continue;
   session={...session,count:parts.length,stopped:true,complete:Boolean(session.stopped&&session.complete)};
   this.entries.set(session.id,{directory,session,chain:Promise.resolve()});
  }
  return this.sessions();
 }
 async exportFile(session){
  const entry=this.entries.get(session.id);if(!entry||!entry.session.count)throw new Error('No saved parts were found.');
  const target=await this.directory.getFileHandle(entry.session.filename,{create:true}),writer=await target.createWritable();
  try{
   for(let index=0;index<entry.session.count;index++){
    const file=await(await entry.directory.getFileHandle(partName(index))).getFile();
    // Stream each part; rebuilding a long live never loads the whole movie into RAM.
    const reader=file.stream().getReader();
    try{while(true){const {value,done}=await reader.read();if(done)break;await writer.write(value);}}finally{reader.releaseLock();}
   }
   await writer.close();return entry.session.filename;
  }catch(error){await writer.abort().catch(()=>{});throw error;}
 }
 // Fully uploaded: keep the parts on disk as the local copy, just stop re-sending them.
 async remove(id){const entry=this.entries.get(id);if(!entry)return;entry.session={...entry.session,done:true};await this.save(entry);}
}
export async function chooseDiskRecordingFolder({picker=globalThis.showDirectoryPicker?.bind(globalThis)}={}){
 if(!picker)throw new Error('Saving recoverable chunks to disk requires desktop Chrome or Edge over HTTPS (or localhost).');
 const directory=await picker({id:'echo-live-recordings',mode:'readwrite',startIn:'downloads'});
 const store=new DiskRecordingStore(directory);await store.recover();return store;
}
