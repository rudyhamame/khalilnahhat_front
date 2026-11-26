import test from 'node:test';
import assert from 'node:assert/strict';
import {meetingMediaConstraints,meetingDeviceList,replaceMeetingDevice} from './meetingDevices.mjs';
const track=(kind,enabled=true)=>({kind,enabled,stopped:false,stop(){this.stopped=true;}});
const stream=(...tracks)=>({tracks,getTracks(){return [...this.tracks];},addTrack(track){this.tracks.push(track);},removeTrack(track){this.tracks=this.tracks.filter(item=>item!==track);}});
test('call capture uses selected inputs and never requests a camera for voice calls',()=>{
 assert.deepEqual(meetingMediaConstraints('voice',{audio:'mic-2',video:'cam-2'}),{audio:{deviceId:{exact:'mic-2'}},video:false});
 assert.deepEqual(meetingMediaConstraints('video',{audio:'mic-2',video:'cam-2'}),{audio:{deviceId:{exact:'mic-2'}},video:{deviceId:{exact:'cam-2'}}});
 assert.deepEqual(meetingMediaConstraints('video'),{audio:true,video:true});
});
test('device options include real microphones and cameras, excluding output devices and duplicate system default',async()=>{
 const devices=await meetingDeviceList({enumerateDevices:async()=>[{kind:'audioinput',deviceId:'default',label:'Default'},{kind:'audioinput',deviceId:'mic',label:'USB mic'},{kind:'videoinput',deviceId:'cam',label:'Camera'},{kind:'audiooutput',deviceId:'speaker',label:'Speakers'}]});
 assert.deepEqual(devices,{audio:[{id:'mic',label:'USB mic'}],video:[{id:'cam',label:'Camera'}]});
});
test('switching inputs replaces only that sender and preserves mute/camera-off without renegotiation',async()=>{
 for(const kind of ['audio','video']){
  const old=track(kind,false),other=track(kind==='audio'?'video':'audio'),next=track(kind),local=stream(old,other),calls=[];
  const sender={track:old,replaceTrack:async value=>calls.push(value)};
  const success=await replaceMeetingDevice({kind,deviceId:'new-device',stream:local,peer:{getSenders:()=>[sender,{track:other,replaceTrack:()=>assert.fail('Unrelated sender changed')}]},mediaDevices:{getUserMedia:async constraints=>{assert.deepEqual(constraints,{audio:kind==='audio'?{deviceId:{exact:'new-device'}}:false,video:kind==='video'?{deviceId:{exact:'new-device'}}:false});return stream(next);}}});
  assert.equal(success,true);assert.deepEqual(calls,[next]);assert.equal(next.enabled,false);assert.equal(old.stopped,true);assert.equal(other.stopped,false);assert.deepEqual(local.getTracks(),[other,next]);
 }
});
test('a failed switch retains the old device and stops the rejected new track',async()=>{
 const old=track('video'),next=track('video'),local=stream(old);
 await assert.rejects(replaceMeetingDevice({kind:'video',deviceId:'camera',stream:local,peer:{getSenders:()=>[{track:old,replaceTrack:async()=>{throw new Error('Device switch rejected');}}]},mediaDevices:{getUserMedia:async()=>stream(next)}}),/rejected/);
 assert.deepEqual(local.getTracks(),[old]);assert.equal(old.stopped,false);assert.equal(next.stopped,true);
});
test('ending a call while a switch is pending releases the new capture',async()=>{
 const old=track('audio'),next=track('audio'),local=stream(old);let current=true,release;
 const pending=replaceMeetingDevice({kind:'audio',deviceId:'mic',stream:local,peer:null,isCurrent:()=>current,mediaDevices:{getUserMedia:()=>new Promise(resolve=>{release=()=>resolve(stream(next));})}});
 current=false;release();assert.equal(await pending,false);assert.equal(next.stopped,true);assert.deepEqual(local.getTracks(),[old]);
});
test('preview device changes work without a peer connection',async()=>{
 const old=track('video'),next=track('video'),local=stream(old);
 assert.equal(await replaceMeetingDevice({kind:'video',deviceId:'cam',stream:local,peer:null,mediaDevices:{getUserMedia:async()=>stream(next)}}),true);
 assert.deepEqual(local.getTracks(),[next]);assert.equal(old.stopped,true);
});

test('mute changes during a pending sender replacement reach the new track',async()=>{
 const old=track('audio'),next=track('audio'),local=stream(old);let candidate;
 await replaceMeetingDevice({kind:'audio',deviceId:'new-mic',stream:local,onCandidate:value=>{candidate=value;},peer:{getSenders:()=>[{track:old,replaceTrack:async()=>{old.enabled=false;candidate.enabled=false;assert.equal(next.enabled,false);}}]},mediaDevices:{getUserMedia:async()=>stream(next)}});
 assert.equal(next.enabled,false);assert.equal(old.stopped,true);
});

test('a call ended while replaceTrack is pending never retains the new device capture',async()=>{
 const old=track('video'),next=track('video'),local=stream(old);let current=true;
 const result=await replaceMeetingDevice({kind:'video',deviceId:'camera',stream:local,isCurrent:()=>current,peer:{getSenders:()=>[{track:old,replaceTrack:async()=>{current=false;}}]},mediaDevices:{getUserMedia:async()=>stream(next)}});
 assert.equal(result,false);assert.equal(next.stopped,true);assert.deepEqual(local.getTracks(),[old]);
});
