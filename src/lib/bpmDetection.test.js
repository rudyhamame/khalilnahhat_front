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
