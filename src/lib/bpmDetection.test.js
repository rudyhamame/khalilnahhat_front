import test from 'node:test';
import assert from 'node:assert/strict';
import {detectTempos} from './bpmDetection.js';
const fs=16000;
// A kick-like pulse every beat (decaying low sine), plus an off-beat hat so the tempo is not trivially a click.
function pulses(bpm,seconds,start=0,out){
 const beat=60/bpm;for(let t=0;t<seconds;t+=beat){const at=Math.floor((start+t)*fs);for(let i=0;i<fs*.12&&at+i<out.length;i++)out[at+i]+=Math.sin(2*Math.PI*70*i/fs)*Math.exp(-i/(fs*.03));}
}
test('finds a steady 120 BPM',()=>{
 const data=new Float32Array(fs*60);pulses(120,60,0,data);
 const result=detectTempos(data,fs);assert.equal(result.multiple,false);assert.ok(Math.abs(result.tempos[0].bpm-120)<1.5,`got ${result.tempos[0].bpm}`);
});
test('finds 100 BPM and 140 BPM when the tempo changes, and says so',()=>{
 const data=new Float32Array(fs*120);pulses(100,60,0,data);pulses(140,60,60,data);
 const result=detectTempos(data,fs);assert.equal(result.multiple,true);
 const found=result.tempos.map(item=>Math.round(item.bpm)).sort((a,b)=>a-b);assert.ok(Math.abs(found[0]-100)<=2&&Math.abs(found[1]-140)<=3,`got ${found}`);
});

test('half-speed and double-speed readings of one tempo fold into the same octave',async()=>{
 const {foldTempo}=await import('./bpmDetection.js');
 assert.equal(foldTempo(142.5),142.5);assert.equal(foldTempo(71.25),142.5);assert.equal(foldTempo(285),142.5);
 assert.ok(Math.abs(foldTempo(71.5)-foldTempo(142.5))/142.5<.035,'71.5 and 142.5 are one tempo');
 assert.equal(foldTempo(120),120);
});

test('a stretch read at half speed or 3:2 is the same groove, not a second tempo',()=>{
 const data=new Float32Array(fs*90);pulses(140,45,0,data);pulses(70,45,45,data);
 const result=detectTempos(data,fs);assert.equal(result.multiple,false,JSON.stringify(result.tempos.map(t=>t.bpm)));
 assert.ok(Math.abs(result.tempos[0].bpm-140)<2.5,`got ${result.tempos[0].bpm}`);
});
