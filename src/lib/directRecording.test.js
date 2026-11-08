import test from 'node:test';import assert from 'node:assert/strict';
import {drainRecording,recoverRecordings,recordingMime,recordingUploadMessage} from './directRecording.js';
function fixture(){const session={id:'one',count:2,stopped:true,complete:true,updatedAt:0};const chunks=[{key:'a',id:'one',sequence:0,bytes:new ArrayBuffer(1),mime:'video/webm'},{key:'b',id:'one',sequence:1,bytes:new ArrayBuffer(1),mime:'video/webm'}];return {session,chunks,store:{async sessions(){return [session];},async next(){return chunks[0];},async ack(key){assert.equal(chunks[0].key,key);chunks.shift();},async remove(){session.removed=true;},async markStopped(_id,complete){session.stopped=true;session.complete=complete;}}};}
test('failed upload retains durable bytes and retry sends chunks in order before finalization',async()=>{const f=fixture();await assert.rejects(drainRecording({...f,id:'one',upload:async()=>{throw new Error('offline');},finish:()=>assert.fail()}),/offline/);assert.equal(f.chunks.length,2);const received=[];await drainRecording({...f,id:'one',upload:async(_id,sequence)=>received.push(sequence),finish:async(_id,body)=>{assert.equal(f.chunks.length,0);assert.equal(body.chunks,2);assert.equal(body.complete,true);}});assert.deepEqual(received,[0,1]);assert.equal(f.session.removed,true);});
test('failed finalize keeps session manifest for an idempotent retry',async()=>{const f=fixture();f.chunks.length=0;await assert.rejects(drainRecording({...f,id:'one',upload:()=>assert.fail(),finish:async()=>{throw new Error('lost acknowledgement');}}));assert.equal(f.session.removed,undefined);await drainRecording({...f,id:'one',upload:()=>assert.fail(),finish:async()=>{}});assert.equal(f.session.removed,true);});
test('recovery skips a recently active tab and marks an orphaned recording incomplete',async()=>{const f=fixture();f.session.stopped=false;f.session.updatedAt=Date.now();let finished=false;const options={...f,upload:async()=>{},finish:async(_id,body)=>{finished=true;assert.equal(body.complete,false);}};await recoverRecordings(options);assert.equal(finished,false);f.session.updatedAt=0;await recoverRecordings(options);assert.equal(finished,true);});
test('MP4 is preferred when supported and WebM remains a fallback',()=>{assert.match(recordingMime({isTypeSupported:type=>type.startsWith('video/mp4')}),/^video\/mp4/);assert.match(recordingMime({isTypeSupported:type=>type.startsWith('video/webm')}),/^video\/webm/);assert.equal(recordingMime({isTypeSupported:()=>false}),undefined);});
test('temporary busy and rate limit responses retry retained bytes and clear the paused status',async()=>{
 const f=fixture();f.session.stopped=false;const messages=['Recording upload paused.'],delays=[],received=[];let calls=0;
 await drainRecording({...f,id:'one',attempts:4,wait:async ms=>delays.push(ms),onStatus:message=>messages.push(message),upload:async(_id,sequence)=>{
  if(++calls===1)throw Object.assign(new Error('Recording is busy.'),{status:409});
  if(calls===2)throw Object.assign(new Error('Wait.'),{status:429,retryAfterMs:15000});
  received.push(sequence);
 },finish:()=>assert.fail()});
 assert.deepEqual(delays,[2000,15000]);assert.deepEqual(received,[0,1]);assert.equal(messages.at(-1),'Recording uploads are up to date.');
});
test('authentication failures retain chunks without repeatedly retrying an expired token',async()=>{
 const f=fixture();let calls=0;
 await assert.rejects(drainRecording({...f,id:'one',attempts:4,wait:()=>assert.fail(),upload:async()=>{calls++;throw Object.assign(new Error('Unauthorized'),{status:401});},finish:()=>assert.fail()}),{status:401});
 assert.equal(calls,1);assert.equal(f.chunks.length,2);assert.match(recordingUploadMessage({status:401}),/Sign in again/);
});
test('capture and recovery share one drain without duplicate uploads or acknowledgements',async()=>{
 const f=fixture();let release,entered;const gate=new Promise(resolve=>{release=resolve;}),started=new Promise(resolve=>{entered=resolve;});const received=[];let finishes=0;
 const options={...f,id:'one',upload:async(_id,sequence)=>{received.push(sequence);if(sequence===0){entered();await gate;}},finish:async()=>{finishes++;}};
 const first=drainRecording(options);await started;const second=drainRecording(options);assert.equal(first,second);release();await Promise.all([first,second]);
 assert.deepEqual(received,[0,1]);assert.equal(finishes,1);
});
test('exhausted transient retries preserve all pending chunks and report the cause',async()=>{
 const f=fixture();let calls=0;
 await assert.rejects(drainRecording({...f,id:'one',attempts:4,wait:async()=>{},upload:async()=>{calls++;throw new Error('offline');},finish:()=>assert.fail()}),/offline/);
 assert.equal(calls,4);assert.equal(f.chunks.length,2);assert.match(recordingUploadMessage(new Error('Disk is full.')),/Disk is full/);
});
