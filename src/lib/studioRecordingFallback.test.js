import test from'node:test';import assert from'node:assert/strict';import{startStudioBroadcast}from'./studioRecordingFallback.js';
test('OVH recording failure offers a device-only choice and starts the live with server recording disabled',async()=>{
 const bodies=[];let asked=0;
 const result=await startStudioBroadcast({title:'Set',saveRecording:true,hasFolder:()=>true,makeId:()=> 'id',askLocalOnly:async()=>{asked++;return true;},request:async body=>{bodies.push(body);if(bodies.length===1)throw Object.assign(Error('Recording disk is full'),{status:507});return {roomName:'room',recording:{mode:'none'}};}});
 assert.equal(asked,1);assert.equal(bodies[1].saveRecording,false);assert.equal(result.roomName,'room');assert.deepEqual(result.recording,{mode:'local',id:'local-id'});
});
test('canceling or unrelated playback failures never start an unapproved fallback',async()=>{
 for(const error of [Object.assign(Error('Recording unavailable'),{status:503}),Object.assign(Error('Sign in'),{status:401})]){
  let requests=0;await assert.rejects(startStudioBroadcast({title:'Set',saveRecording:true,hasFolder:()=>true,askLocalOnly:async()=>false,request:async()=>{requests++;throw error;}}));assert.equal(requests,1);
 }
});
