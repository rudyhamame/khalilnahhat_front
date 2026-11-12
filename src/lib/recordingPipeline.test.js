import test from 'node:test';import assert from 'node:assert/strict';
import {recordingPipeline} from './recordingPipeline.js';
const states=p=>p.stages.map(s=>s.state).join(',');
test('idle until something happens',()=>{const p=recordingPipeline({folder:'LIVE'});assert.equal(p.idle,true);assert.equal(p.label,'Idle');assert.equal(states(p),'done,idle,idle,idle');});
test('live recording, then uploading, then archiving, then stored',()=>{
  assert.equal(states(recordingPipeline({folder:'F',live:true,recorded:5e6,saved:5e6})),'done,active,queued,idle'); // the OVH upload waits for End live
  const up=recordingPipeline({folder:'F',recorded:5e6,saved:1e6});assert.equal(states(up),'done,done,active,idle');assert.equal(up.percent,20);assert.equal(up.label,'Uploading');
  assert.equal(states(recordingPipeline({folder:'F',recorded:5e6,saved:5e6,message:'Recording uploaded. Preparing the archive.'})),'done,done,done,active');
  const done=recordingPipeline({folder:'F',serverStatus:'ready'});assert.equal(states(done),'done,done,done,done');assert.equal(done.label,'Stored');
});
test('after a refresh the counters are zero but OVH status still completes the earlier stages',()=>{
  const p=recordingPipeline({folder:'F',serverStatus:'processing'});assert.equal(states(p),'done,done,done,active');assert.equal(p.idle,false);
});
test('upload trouble shows on the upload stage; a failed Cloudinary save shows on the archive stage',()=>{
  assert.equal(recordingPipeline({folder:'F',recorded:1,saved:0,message:'Recording upload paused. offline'}).stages[2].state,'error');
  const failed=recordingPipeline({folder:'F',serverStatus:'upload_failed',local:{count:3,uploaded:3,done:true}});assert.equal(failed.stages[2].state,'done');assert.equal(failed.stages[3].state,'error');assert.match(failed.stages[3].hint,/could not finish saving this to Cloudinary/);assert.equal(failed.tone,'is-failed');
});
test('focus is the most relevant stage',()=>{assert.equal(recordingPipeline({folder:'F',live:true,recorded:1}).focus.key,'capture');assert.equal(recordingPipeline({serverStatus:'ready'}).focus.key,'archive');});
test('finished stages switch to the past tense',()=>{
  const titles=p=>p.stages.map(s=>s.title).join(' | ');
  assert.equal(titles(recordingPipeline({folder:'F',live:true,recorded:1,saved:1})),'Folder | Recording | Queued for OVH | Archiving in Cloudinary');
  assert.equal(titles(recordingPipeline({folder:'F',serverStatus:'ready'})),'Folder | Recorded | Uploaded to OVH | Archived in Cloudinary');
});
test('Uploaded to OVH means every part in the folder was confirmed and OVH accepted the finish',()=>{
  const base={folder:'F'},titles=p=>p.stages.map(s=>s.title).join(' | ');
  const half=recordingPipeline({...base,local:{count:54,uploaded:15,done:false}});
  assert.equal(half.stages[2].state,'active');assert.equal(half.sentLabel,'15 parts of 54 parts');assert.notEqual(half.stages[2].title,'Uploaded to OVH');
  const allSentNotFinished=recordingPipeline({...base,local:{count:54,uploaded:54,done:false}});
  assert.equal(allSentNotFinished.stages[2].state,'idle');assert.notEqual(allSentNotFinished.stages[2].title,'Uploaded to OVH');
  const done=recordingPipeline({...base,local:{count:54,uploaded:54,done:true},serverStatus:'processing'});
  assert.equal(titles(done),'Folder | Recorded | Uploaded to OVH | Archiving in Cloudinary');assert.match(done.stages[2].hint,/All 54 parts confirmed/);
});
test('OVH archiving a recording it never fully received is flagged, not shown as uploaded',()=>{
  const p=recordingPipeline({folder:'F',serverStatus:'processing',local:{count:54,uploaded:15,done:false}});
  assert.equal(p.stages[2].state,'error');assert.match(p.stages[2].hint,/OVH closed this recording with 15 parts of 54 parts/);assert.equal(p.stages[3].state,'idle');assert.equal(p.label,'Needs attention');
});
test('with the folder known every number counts parts',()=>{
  const p=recordingPipeline({folder:'F',live:true,local:{count:54,uploaded:15,done:false,bytes:71e6}});
  assert.equal(p.stages[1].meta,'54 parts');assert.equal(p.stages[2].meta,'15 / 54');assert.equal(p.parts,54);assert.equal(p.percent,28);
});
test('the Cloudinary stage is named for what it does and shows how many parts are stored',()=>{
  const busy=recordingPipeline({folder:'F',serverStatus:'processing',cloudParts:3,local:{count:42,uploaded:42,done:true}});
  assert.equal(busy.stages[3].title,'Archiving in Cloudinary');assert.equal(busy.stages[3].meta,'3 stored');assert.match(busy.stages[3].hint,/3 parts stored so far/);
  const done=recordingPipeline({folder:'F',serverStatus:'ready',cloudParts:1,local:{count:42,uploaded:42,done:true}});
  assert.equal(done.stages[3].title,'Archived in Cloudinary');assert.match(done.stages[3].hint,/1 part\./);
});

test('while the live is paused the recording stage shows paused and nothing counts as uploading',()=>{
  const p=recordingPipeline({folder:'F',live:true,paused:true,local:{count:20,uploaded:12,done:false}});
  assert.equal(p.stages[1].state,'paused');assert.equal(p.stages[1].title,'Recording paused');assert.equal(p.stages[2].state,'queued');assert.equal(p.label,'Paused');
  const resumed=recordingPipeline({folder:'F',live:true,paused:false,local:{count:20,uploaded:12,done:false}});assert.equal(resumed.stages[1].state,'active');assert.equal(resumed.label,'Recording');
});

test('after a refresh the live is on air but the browser has no input: the recording shows paused and says why',()=>{
  const p=recordingPipeline({folder:'F',live:true,paused:true,noInput:true,local:{count:20,uploaded:20,done:false}});
  assert.equal(p.stages[1].state,'paused');assert.match(p.stages[1].hint,/No input.*same file.*reconnect/);assert.equal(p.label,'Paused');
});

test('while the live is on air the OVH step is queued, never "uploading", and nothing counts as sending',()=>{
  const live=recordingPipeline({folder:'F',live:true,local:{count:85,uploaded:0,done:false,bytes:157e6}});
  const upload=live.stages.find(step=>step.key==='upload');
  assert.deepEqual([upload.title,upload.state,upload.meta],['Queued for OVH','queued','0 / 85']);
  assert.equal(live.sending,false);
  assert.match(upload.hint,/after End live/);
  // paused live: still queued
  assert.equal(recordingPipeline({folder:'F',live:true,paused:true,local:{count:85,uploaded:0,done:false}}).stages.find(step=>step.key==='upload').state,'queued');
  // once the live has ended the parts really upload
  const ended=recordingPipeline({folder:'F',live:false,local:{count:85,uploaded:10,done:false}});
  assert.deepEqual([ended.stages.find(step=>step.key==='upload').title,ended.stages.find(step=>step.key==='upload').state,ended.sending],['Uploading to OVH','active',true]);
});
