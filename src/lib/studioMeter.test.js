import test from 'node:test';
import assert from 'node:assert/strict';
import {samplePeak,advanceMeter,emptyMeter,gainToFader,faderToGain,meterPosition} from './studioMeter.js';
test('stereo peaks do not cancel when left and right are opposite in phase',()=>{
 const left=new Float32Array([0,.5,-.5,0]),right=new Float32Array([0,-.5,.5,0]);
 assert.ok(Math.abs(samplePeak([left,right])+6.0206)<.0001);
 assert.equal(samplePeak([new Float32Array(8)]),-Infinity);
 assert.equal(samplePeak([left,new Float32Array([1])]),0);
});
test('meter attack, release and held peak follow elapsed time and actual full-scale clips',()=>{
 let state=advanceMeter(emptyMeter(),-6,.03);assert.equal(state.levelDb,-6);assert.equal(state.peakDb,-6);assert.equal(state.clip,false);
 state=advanceMeter(state,-30,.1);assert.equal(state.levelDb,-8.4);assert.equal(state.peakDb,-6);
 for(let n=0;n<16;n++)state=advanceMeter(state,-30,.1);
 assert.ok(state.peakDb<-6);assert.ok(state.peakDb>-30);
 state=advanceMeter(state,-.01,.03);assert.equal(state.clip,false);
 state=advanceMeter(state,0,.03);assert.equal(state.clip,true);
 assert.equal(advanceMeter(state,-Infinity,.1).clip,true);
});
test('gain taper has distinct off, unity and +6dB endpoints, with a separate signal scale',()=>{
 assert.equal(faderToGain(0),0);assert.equal(faderToGain(1000),2);assert.equal(gainToFader(2),1000);
 assert.ok(gainToFader(1)>900);assert.equal(faderToGain(Math.round(gainToFader(1))),1);
 for(const gain of [.01,.1,.25,.5,1,1.5,2])assert.ok(Math.abs(faderToGain(gainToFader(gain))-gain)<.0001);
 assert.equal(meterPosition(-Infinity),0);assert.equal(meterPosition(-30),.5);assert.equal(meterPosition(0),1);
});
