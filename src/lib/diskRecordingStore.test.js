import test from 'node:test';
import assert from 'node:assert/strict';
import {DiskRecordingStore,chooseDiskRecordingFolder} from './diskRecordingStore.js';
class Directory{
 constructor(name='Downloads'){this.name=name;this.kind='directory';this.items=new Map();this.failManifest=false;}
 async getDirectoryHandle(name,{create}={}){if(!this.items.has(name)){if(!create)throw Error('Missing directory');this.items.set(name,new Directory(name));}return this.items.get(name);}
 async getFileHandle(name,{create}={}){
  if(!this.items.has(name)){if(!create)throw Error('Missing file');const file={name,kind:'file',bytes:new Uint8Array(),getFile:async()=>new Blob([file.bytes]),createWritable:async()=>{
   const pending=[];return{write:async data=>{if(name==='recording.json'&&this.failManifest)throw Error('Manifest interrupted');pending.push(typeof data==='string'?new TextEncoder().encode(data):new Uint8Array(data));},close:async()=>{file.bytes=new Uint8Array(await new Blob(pending).arrayBuffer());},abort:async()=>{}};
  }};this.items.set(name,file);}return this.items.get(name);
 }
 async *values(){yield* this.items.values();}
}
const session={id:'one-landscape',filename:'Echo-live-test-landscape-1280x720.webm',format:'landscape',mime:'video/webm',count:0,bytes:0,stopped:false,complete:false,updatedAt:1};
test('disk parts are ordered and rebuild byte-for-byte without deleting recovery files',async()=>{
 const root=new Directory(),store=new DiskRecordingStore(root);await store.put(session);
 await store.append(session.id,new Uint8Array([1,2]).buffer,'video/webm');await store.append(session.id,new Uint8Array([3,4]).buffer,'video/webm');await store.markStopped(session.id,true);
 const saved=(await store.sessions())[0];assert.equal(saved.count,2);assert.equal(saved.complete,true);
 assert.equal(await store.exportFile(saved),session.filename);
 assert.deepEqual([...root.items.get(session.filename).bytes],[1,2,3,4]);
 assert.ok(root.items.get(session.id).items.has('00000000.part'));
 const recovered=await new DiskRecordingStore(root).recover();assert.equal(recovered[0].count,2);assert.equal(recovered[0].complete,true);
});
test('recovery discovers a closed part even when the manifest update was interrupted',async()=>{
 const root=new Directory(),store=new DiskRecordingStore(root);await store.put(session);root.items.get(session.id).failManifest=true;
 await assert.rejects(store.append(session.id,new Uint8Array([7,8]).buffer,'video/webm'),/Manifest interrupted/);
 const recovery=new DiskRecordingStore(root),files=await recovery.recover();assert.equal(files.length,1);assert.equal(files[0].count,1);assert.equal(files[0].complete,false);
 await recovery.exportFile(files[0]);assert.deepEqual([...root.items.get(session.filename).bytes],[7,8]);
});
test('recovery skips unrelated folders and gaps rather than producing corrupt concatenations',async()=>{
 const root=new Directory(),store=new DiskRecordingStore(root);await store.put(session);await store.append(session.id,new Uint8Array([1]).buffer,'video/webm');
 const dir=root.items.get(session.id);dir.items.set('00000002.part',{name:'00000002.part',kind:'file'});
 await root.getDirectoryHandle('photos',{create:true});assert.deepEqual(await new DiskRecordingStore(root).recover(),[]);
});
test('folder picker requests writable access and starts in Downloads',async()=>{
 let options;const store=await chooseDiskRecordingFolder({picker:async value=>{options=value;return new Directory();}});
 assert.equal(options.mode,'readwrite');assert.equal(options.startIn,'downloads');assert.equal(store.directory.name,'Downloads');
 await assert.rejects(chooseDiskRecordingFolder({picker:null}),/Chrome or Edge/);
});
