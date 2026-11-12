import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAudio} from './audioAnalysis.js';
const tone=(amp,seconds=6,fs=32000,hz=997)=>Float32Array.from({length:seconds*fs},(_,i)=>amp*Math.sin(2*Math.PI*hz*i/fs));
test('peak, rms and silence are measured in dBFS',()=>{
 const left=tone(.5),r=analyzeAudio([left,left],32000);
 assert.ok(Math.abs(r.peakDb+6.02)<.1);assert.ok(Math.abs(r.rmsDb+9.03)<.1);assert.equal(r.clippedSamples,0);assert.ok(r.correlation>.99);
});
test('loudness rises 6 LU when the level doubles; stereo inversion gives negative correlation',()=>{
 const quiet=analyzeAudio([tone(.25),tone(.25)],32000),loud=analyzeAudio([tone(.5),tone(.5)],32000);
 assert.ok(Math.abs(loud.lufs-quiet.lufs-6.02)<.2);
 const left=tone(.5),inverted=left.map(x=>-x);assert.ok(analyzeAudio([left,inverted],32000).correlation<-.99);
});
test('clipping and head silence are detected',()=>{
 const fs=32000,data=new Float32Array(fs*4);for(let i=fs;i<fs*3;i++)data[i]=i%1000<5?1:.2;
 const r=analyzeAudio([data,data],fs);assert.ok(r.clipEvents>10);assert.ok(Math.abs(r.headSilence-1)<.1);assert.ok(Math.abs(r.tailSilence-1)<.1);
});
