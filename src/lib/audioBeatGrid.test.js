import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeAudioBeatGrid} from './audioBeatGrid.js';
const rate=8000;
function recording({bpm=123,seconds=48,offset=.37,accent=2.5,backbeat=false,changeAccent=false}={}){
 const data=new Float32Array(rate*seconds);let beat=0;
 for(let time=offset;time<seconds-.15;time+=60/bpm){const phase=changeAccent&&time>seconds/2?2:0;const strong=backbeat?beat%2===1:beat%4===phase;const amp=strong?accent:1,at=Math.round(time*rate);
  for(let i=0;i<rate*.08&&at+i<data.length;i++)data[at+i]+=amp*Math.sin(2*Math.PI*75*i/rate)*Math.exp(-i/(rate*.02));beat++;
 }
 return data;
}
test('detects audio tempo and the actual nonzero downbeat instead of assuming 120 BPM or time zero',()=>{
 const grid=analyzeAudioBeatGrid(recording(),rate);assert.equal(grid.tempoVerified,true,grid.reason);assert.equal(grid.verified,true,grid.reason);assert.ok(Math.abs(grid.bpm-123)<.5);assert.ok(Math.abs(grid.firstDownbeat-.37)<.025,`${grid.firstDownbeat}`);assert.ok(grid.coverage>.9);assert.ok(grid.jitter<.02);
});
test('intro silence and a pickup offset do not become a fictional first beat at zero',()=>{
 const grid=analyzeAudioBeatGrid(recording({offset:3.37,bpm:107}),rate);assert.equal(grid.verified,true,grid.reason);assert.ok(Math.abs(grid.bpm-107)<.5);assert.ok(Math.abs(grid.firstDownbeat-3.37)<.025,`${grid.firstDownbeat}`);
});
test('an equal click track verifies tempo but cannot establish which beat starts a bar',()=>{
 const grid=analyzeAudioBeatGrid(recording({accent:1}),rate);assert.equal(grid.tempoVerified,true);assert.equal(grid.verified,false);assert.equal(grid.firstDownbeat,null);
});
test('equally strong backbeats and changing bar accents stay downbeat-ambiguous',()=>{
 for(const input of [recording({backbeat:true}),recording({changeAccent:true})]){const grid=analyzeAudioBeatGrid(input,rate);assert.equal(grid.verified,false,JSON.stringify(grid));}
});
test('silence, sustained sound, random noise and changing tempos cannot verify a stable grid',()=>{
 const silence=new Float32Array(rate*30);assert.equal(analyzeAudioBeatGrid(silence,rate).verified,false);
 const tone=Float32Array.from({length:rate*30},(_,i)=>Math.sin(2*Math.PI*440*i/rate)*.2);assert.equal(analyzeAudioBeatGrid(tone,rate).verified,false);
 let seed=19;const noise=Float32Array.from({length:rate*30},()=>{seed=(seed*16807)%2147483647;return (seed/2147483647-.5)*.3;});assert.equal(analyzeAudioBeatGrid(noise,rate).verified,false);
 const first=recording({seconds:24,bpm:100}),second=recording({seconds:24,bpm:140}),changed=new Float32Array(first.length+second.length);changed.set(first);changed.set(second,first.length);assert.equal(analyzeAudioBeatGrid(changed,rate).tempoVerified,false);
});
