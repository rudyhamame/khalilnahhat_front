import test from 'node:test';import assert from 'node:assert/strict';
import {createLiveKeyTracker,spectrumChroma} from './liveVocalKey.js';
import {resolveVocalSettings,VOCAL_DEFAULTS} from './vocalPitch.js';
const MAJOR=[6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88];
const MINOR=[6.33,2.68,3.52,5.38,2.6,3.53,2.54,4.75,3.98,2.69,3.34,3.17];
const rotated=(profile,key)=>profile.map((_,i)=>profile[(i-key+12)%12]);
test('auto key waits for evidence and agreement before selecting the music key',()=>{
 const tracker=createLiveKeyTracker();let key;
 for(let now=0;now<4000;now+=500)assert.equal(tracker.push(MAJOR,now),null);
 for(let now=4000;now<=6000;now+=500)key=tracker.push(MAJOR,now);
 assert.equal(key.key,'C major');assert.equal(key.tonic,0);
 for(let now=6500;now<=30000;now+=500)key=tracker.push(rotated(MINOR,9),now);
 assert.equal(key.key,'A minor');assert.equal(key.tonic,9);
 assert.equal(tracker.push(new Array(12).fill(0),36501),null);
});
test('silence, broadband noise, and one note do not invent a key',()=>{
 for(const chroma of [new Array(12).fill(0),new Array(12).fill(1),[1,0,0,0,0,0,0,0,0,0,0,0]]){
  const tracker=createLiveKeyTracker();for(let now=0;now<15000;now+=500)assert.equal(tracker.push(chroma,now),null);
 }
 assert.deepEqual(spectrumChroma(new Float32Array(8192).fill(-Infinity),48000,16384),new Array(12).fill(0));
});
test('automatic settings apply the detected major/minor key and fall back to chromatic, preserving manual settings',()=>{
 const settings={...VOCAL_DEFAULTS,key:5,scale:'minor'};
 assert.equal(resolveVocalSettings(settings,null).scale,'chromatic');
 assert.equal(resolveVocalSettings(settings,{tonic:9,mode:'minor'}).key,9);
 assert.equal(settings.key,5);
 assert.equal(resolveVocalSettings({...settings,autoKey:false},{tonic:9,mode:'minor'}).key,5);
});

test('a chord progression establishes C major without switching key on its dominant chord',()=>{
 const tracker=createLiveKeyTracker();let now=0,key;
 for(const [notes,seconds] of [[[60,64,67],12],[[65,69,72],4],[[67,71,74],4],[[60,64,67],8]]){
  const bins=new Float32Array(8192).fill(-Infinity);
  for(const note of notes)for(let harmonic=1;harmonic<=3;harmonic++){
   const bin=Math.round(440*2**((note-69)/12)*harmonic/48000*16384);bins[bin]=-20-20*Math.log10(harmonic);
  }
  for(let frame=0;frame<seconds*2;frame++,now+=500)key=tracker.push(spectrumChroma(bins,48000,16384),now);
  if(now>=16000)assert.equal(key?.key,'C major');
 }
});
