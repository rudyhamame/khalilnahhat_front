import test from 'node:test';import assert from 'node:assert/strict';
import {recordingPipeline} from './recordingPipeline.js';
const states=p=>p.stages.map(s=>s.state).join(',');
test('idle until something happens',()=>{const p=recordingPipeline({folder:'LIVE'});assert.equal(p.idle,true);assert.equal(p.label,'Idle');assert.equal(states(p),'done,idle,idle,idle');});
test('live recording, then uploading, then archiving, then stored',()=>{
  assert.equal(states(recordingPipeline({folder:'F',live:true,recorded:5e6,saved:5e6})),'done,active,idle,idle');
  const up=recordingPipeline({folder:'F',recorded:5e6,saved:1e6});assert.equal(states(up),'done,done,active,idle');assert.equal(up.percent,20);assert.equal(up.label,'Uploading');
  assert.equal(states(recordingPipeline({folder:'F',recorded:5e6,saved:5e6,message:'Recording uploaded. Preparing the archive.'})),'done,done,done,active');
  const done=recordingPipeline({folder:'F',serverStatus:'ready'});assert.equal(states(done),'done,done,done,done');assert.equal(done.label,'Stored');
});
test('after a refresh the counters are zero but OVH status still completes the earlier stages',()=>{
  const p=recordingPipeline({folder:'F',serverStatus:'processing'});assert.equal(states(p),'done,done,done,active');assert.equal(p.idle,false);
});
test('trouble is shown on the upload stage, from a message or a failed server status',()=>{
  assert.equal(recordingPipeline({folder:'F',recorded:1,saved:0,message:'Recording upload paused. offline'}).stages[2].state,'error');
  const failed=recordingPipeline({folder:'F',serverStatus:'upload_failed'});assert.equal(failed.stages[2].state,'error');assert.equal(failed.tone,'is-failed');
});
test('focus is the most relevant stage',()=>{assert.equal(recordingPipeline({folder:'F',live:true,recorded:1}).focus.key,'capture');assert.equal(recordingPipeline({serverStatus:'ready'}).focus.key,'archive');});
test('finished stages switch to the past tense',()=>{
  const titles=p=>p.stages.map(s=>s.title).join(' | ');
  assert.equal(titles(recordingPipeline({folder:'F',live:true,recorded:1,saved:1})),'Folder | Recording | Uploading to OVH | Archiving');
  assert.equal(titles(recordingPipeline({folder:'F',serverStatus:'ready'})),'Folder | Recorded | Uploaded to OVH | Archived');
});
