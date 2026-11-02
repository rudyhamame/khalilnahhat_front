import {test} from 'node:test';
import assert from 'node:assert/strict';
import {liveAudioProcessing,applyLiveAudioProcessing} from './liveAudioProcessing.js';
test('music remains natural and voice enables cancellation, noise and gain controls',()=>{
 assert.deepEqual(liveAudioProcessing('music'),{echoCancellation:false,noiseSuppression:false,autoGainControl:false});
 assert.deepEqual(liveAudioProcessing('voice'),{echoCancellation:true,noiseSuppression:true,autoGainControl:true});
 assert.deepEqual(liveAudioProcessing('music',{echoCancellation:true}),{echoCancellation:true,noiseSuppression:false,autoGainControl:false});
});
test('live constraints apply to the original capture via the SDK and report actual settings',async()=>{
 const requested=liveAudioProcessing('voice');let calls=0;
 const track={async applyConstraints(value){calls++;assert.deepEqual(value,requested);},getSourceTrackSettings:()=>({...requested,autoGainControl:false})};
 const actual=await applyLiveAudioProcessing(track,requested);assert.equal(calls,1);assert.equal(actual.echoCancellation,true);assert.equal(actual.autoGainControl,false);
});
test('unreported settings stay unknown and unsupported/failed changes are not reported as applied',async()=>{
 assert.deepEqual(await applyLiveAudioProcessing({async applyConstraints(){}},liveAudioProcessing('voice')),{echoCancellation:null,noiseSuppression:null,autoGainControl:null});
 await assert.rejects(applyLiveAudioProcessing({},{}),/cannot change/);
 await assert.rejects(applyLiveAudioProcessing({async applyConstraints(){throw new Error('Device denied');}},{}),/Device denied/);
});
