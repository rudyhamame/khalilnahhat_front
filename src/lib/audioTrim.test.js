import test from 'node:test';
import assert from 'node:assert/strict';
import {trimBounds,trimClock,waveformPeaks} from './audioTrim.js';
import {encodeWav} from './wavEncode.js';

test('waveform includes brief peaks on either channel without phase cancellation',()=>{
 const channels=[Float32Array.from([0,1,0,0,0,0]),Float32Array.from([0,-1,0,0,0,.8])];
 const buffer={length:6,numberOfChannels:2,getChannelData:i=>channels[i]};
 const peaks=waveformPeaks(buffer,2);
 assert.deepEqual(peaks[0],[-1,1]);assert.equal(peaks[1][0],0);assert.ok(peaks[1][1]>.79);
 assert.equal(waveformPeaks(buffer,100).length,6);
});
test('trim boundaries remain in source range with a nonempty selection, including short clips',()=>{
 assert.deepEqual(trimBounds(-4,20,10),[0,10]);
 const [start,end]=trimBounds(10,2,10);assert.ok(start<end);assert.equal(end,10);
 assert.deepEqual(trimBounds(0,0,.02),[0,.02]);
 assert.deepEqual(trimBounds(NaN,NaN,3),[0,3]);
});
test('time labels carry rounded hundredths into the next minute',()=>{
 assert.equal(trimClock(59.999),'1:00.00');assert.equal(trimClock(62.25),'1:02.25');
});
test('visual selection exports exactly the selected source samples',async()=>{
 const data=Float32Array.from([0,.1,.2,.3,.4,.5,.6,.7]);
 const buffer={length:8,numberOfChannels:1,sampleRate:4,getChannelData:()=>data};
 const [start,end]=trimBounds(.5,1.5,2);
 const result=new DataView(await encodeWav(buffer,Math.floor(start*4),Math.ceil(end*4)).arrayBuffer());
 assert.equal(result.getUint32(40,true),8);
 assert.equal(result.getInt16(44,true),Math.trunc(data[2]*32767));
 assert.equal(result.getInt16(50,true),Math.trunc(data[5]*32767));
});
