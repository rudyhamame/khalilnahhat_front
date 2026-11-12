import test from 'node:test';
import assert from 'node:assert/strict';
import {detectKey} from './keyDetection.js';
const fs=16000,hz=note=>440*2**((note-69)/12);
// A progression in a key: tonic chord is the longest, built from stacked sine partials.
function song(chords){
 const out=new Float32Array(fs*chords.reduce((sum,[,seconds])=>sum+seconds,0));let at=0;
 for(const [notes,seconds] of chords){for(let i=0;i<seconds*fs;i++){let v=0;for(const note of notes)for(let h=1;h<=3;h++)v+=Math.sin(2*Math.PI*hz(note)*h*(at+i)/fs)/h;out[at+i]=v*.1;}at+=seconds*fs;}
 return out;
}
test('detects C major from I-IV-V-I chords',()=>{
 const data=song([[[60,64,67],8],[[65,69,72],4],[[67,71,74],4],[[60,64,67],8]]);
 assert.equal(detectKey(data,fs).keys[0].key,'C major');
});
test('detects A minor from i-iv-v-i chords',()=>{
 const data=song([[[57,60,64],8],[[62,65,69],4],[[64,68,71],4],[[57,60,64],8]]);
 const result=detectKey(data,fs);assert.equal(result.keys[0].key,'A minor');assert.equal(result.keys[0].camelot,'8A');
});
test('honours a time range',()=>{
 const data=song([[[60,64,67],8],[[57,60,64],8],[[57,60,64],8]]);
 assert.equal(detectKey(data,fs,{from:8,to:24}).keys[0].key,'A minor');
});
import {detectKeySegments} from './keyDetection.js';
test('reports several keys when the recording changes key',()=>{
 const section=(notes)=>[[notes,40]];
 const first=song([[[60,64,67],12],[[65,69,72],6],[[67,71,74],6],[[60,64,67],16]]),second=song([[[66,70,73],12],[[71,75,78],6],[[73,77,80],6],[[66,70,73],16]]);
 const merged=new Float32Array(first.length+second.length);merged.set(first);merged.set(second,first.length);
 const result=detectKeySegments(merged,fs);
 assert.equal(result.multiple,true);assert.deepEqual(result.keys.map(entry=>entry.key).sort(),['C major','F# major']);
});
test('reports one key when the key never changes',()=>{
 const one=song([[[60,64,67],12],[[65,69,72],6],[[67,71,74],6],[[60,64,67],16]]),merged=new Float32Array(one.length*2);merged.set(one);merged.set(one,one.length);
 const result=detectKeySegments(merged,fs);assert.equal(result.multiple,false);assert.equal(result.keys[0].key,'C major');
});
