import test from 'node:test';
import assert from 'node:assert/strict';
import {recordingCaptureOutputs,recordingAspectRatios,startRecordingOutputs} from './recordingOutputs.js';
test('capture reports the actual main and portrait dimensions',()=>{
 const track=(width,height)=>({getSettings:()=>({width,height})});
 assert.deepEqual(recordingCaptureOutputs(track(1920,1080),track(720,1280)),[{key:'main',width:1920,height:1080},{key:'portrait',width:720,height:1280}]);
 assert.deepEqual(recordingCaptureOutputs(null,null,{width:720,height:1280}),[{key:'main',width:720,height:1280}]);
 assert.equal(recordingAspectRatios({outputs:[{aspectRatio:'16:9'},{aspectRatio:'9:16'}]}),'16:9 + 9:16');
 assert.equal(recordingAspectRatios({}),'—');
});
test('both camera recorders keep independent IDs and share pause/resume/end lifecycle',async()=>{
 const calls=[],progress=[],uploads=[];
 const record=async options=>{calls.push(['start',options.id,options.tracks]);options.onProgress(10);return {pause:()=>calls.push(['pause',options.id]),resume:()=>calls.push(['resume',options.id]),suspend:async()=>calls.push(['suspend',options.id]),stop:async(complete,{defer})=>{calls.push(['stop',options.id,complete,defer]);return async()=>uploads.push(options.id);}};};
 const group=await startRecordingOutputs({id:'a',roomName:'same-live',outputs:[{id:'a',tracks:['main','mix']},{id:'b',tracks:['portrait','mix']}],onProgress:n=>progress.push(n)},record);
 group.pause();group.resume();const send=await group.stop(true,{defer:true});
 assert.equal(calls.filter(c=>c[0]==='stop').length,2);assert.equal(uploads.length,0);await send();assert.deepEqual(uploads,['a','b']);assert.equal(progress.at(-1),20);
 assert.deepEqual(calls.filter(c=>c[0]==='pause').map(c=>c[1]),['a','b']);assert.deepEqual(calls.filter(c=>c[0]==='resume').map(c=>c[1]),['a','b']);
});
test('a failed output cannot prevent the other recorder from being finalized',async()=>{
 const stopped=[];
 const group=await startRecordingOutputs({outputs:[{id:'a'},{id:'b'}]},async({id})=>({stop:async()=>{stopped.push(id);if(id==='a')throw Error('disk failed');}}));
 await assert.rejects(group.stop(),/disk failed/);assert.deepEqual(stopped,['a','b']);
});
test('failure to start the second camera closes the first instead of leaving a hidden recording',async()=>{
 let closed=false;
 await assert.rejects(startRecordingOutputs({outputs:[{id:'a'},{id:'b'}]},async({id})=>{if(id==='b')throw Error('camera failed');return {stop:async complete=>{assert.equal(complete,false);closed=true;}};}),/camera failed/);
 assert.equal(closed,true);
});
