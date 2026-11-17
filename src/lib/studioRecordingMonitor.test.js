import test from 'node:test';
import assert from 'node:assert/strict';
import {pollStudioRecording,studioRecordingSnapshot,studioServerRecording,studioRecordingSettled} from './studioRecordingMonitor.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
function clock(){const jobs=[];return {jobs,schedule:fn=>{jobs.push(fn);return fn;},cancel:fn=>{const i=jobs.indexOf(fn);if(i>=0)jobs.splice(i,1);}};}

test('a slow read cannot overlap and stopping ignores its late result',async()=>{
 const timer=clock();let resolve,reads=0,values=0,signal;
 const stop=pollStudioRecording({...timer,delay:1500,read:s=>{signal=s;reads++;return new Promise(done=>{resolve=done;});},onValue:()=>values++});
 assert.equal(reads,1);assert.equal(timer.jobs.length,0);
 stop();resolve('late');await flush();
 assert.equal(signal.aborted,true);assert.equal(values,0);assert.equal(timer.jobs.length,0);
});
test('a failed folder read is handled and retried after completion',async()=>{
 const timer=clock();let reads=0;const errors=[],values=[];
 const stop=pollStudioRecording({...timer,delay:1500,read:async()=>{if(++reads===1)throw new Error('folder disconnected');return 'recovered';},onError:error=>errors.push(error.message),onValue:value=>{values.push(value);return false;}});
 await flush();assert.deepEqual(errors,['folder disconnected']);assert.equal(timer.jobs.length,1);
 await timer.jobs.shift()();assert.deepEqual(values,['recovered']);assert.equal(timer.jobs.length,0);stop();
});
test('ready and partial recordings stop polling; missing and pending records retry',async()=>{
 for(const status of ['ready','partial']){
  const timer=clock();const recording=studioServerRecording([{id:'current',status,partCount:5}], 'current');
  assert.equal(recording.parts,5);
  const stop=pollStudioRecording({...timer,delay:4000,read:async()=>recording,onValue:value=>!studioRecordingSettled(value)});
  await flush();assert.equal(timer.jobs.length,0);stop();
 }
 assert.equal(studioRecordingSettled(null),false);
 assert.equal(studioRecordingSettled({status:'uploading'}),false);
 assert.equal(studioServerRecording([{id:'old',status:'ready'}],'new'),null);
});
test('stopping a scheduled poll cancels the next request',async()=>{
 const timer=clock();const stop=pollStudioRecording({...timer,delay:4000,read:async()=>null,onValue:()=>true});
 await flush();assert.equal(timer.jobs.length,1);stop();assert.equal(timer.jobs.length,0);
});
test('progress selects the latest named recording and retains live or unfinished work',()=>{
 const old={id:'old',filename:'old.webm',updatedAt:1,finishedAt:1,done:true};
 const current={id:'new',filename:'new.webm',updatedAt:2,finishedAt:2,done:true,count:4,uploaded:3,bytes:900,localOnly:true};
 const unnamed={id:'pending',updatedAt:99};
 const {files,local}=studioRecordingSnapshot([old,current,unnamed],{live:true,now:900000});
 assert.equal(files.length,2);assert.deepEqual(local,{id:'new',count:4,uploaded:3,bytes:900,localOnly:true,done:true});
 assert.equal(studioRecordingSnapshot([current],{now:900000}).local,null);
 assert.equal(studioRecordingSnapshot([{...current,done:false}],{now:900000}).local.id,'new');
 assert.equal(studioRecordingSnapshot([current],{now:100}).local.id,'new');
 assert.equal(studioRecordingSnapshot([]).local,null);
});
