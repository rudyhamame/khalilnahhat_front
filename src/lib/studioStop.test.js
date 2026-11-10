import test from 'node:test';
import assert from 'node:assert/strict';
import {listenForStudioStop,requestStudioStop} from './studioStop.js';

test('dashboard stop waits for the owning Studio to flush its recording',async()=>{
 let flush,started;const began=new Promise(resolve=>{started=resolve;}),gate=new Promise(resolve=>{flush=resolve;});
 let wrongStops=0,finished=false;
 const wrong=listenForStudioStop({roomName:'other-room',stop:()=>{wrongStops++;}});
 const close=listenForStudioStop({roomName:'test-room',stop:async()=>{started();await gate;finished=true;}});
 try{
  const pending=requestStudioStop('test-room');await began;assert.equal(finished,false);assert.equal(wrongStops,0);
  // React can unmount the on-air controls while the final upload is finishing.
  close();flush();await pending;assert.equal(finished,true);
 }finally{flush();close();wrong();}
});
test('without cross-window support, stop directs the operator to the source instead of dropping its recording',async()=>{
 await assert.rejects(requestStudioStop('test-room',{Channel:null}),/Studio window/);
});
