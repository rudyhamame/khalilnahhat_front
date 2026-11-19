import test from 'node:test';import assert from 'node:assert/strict';import{rhythmGrid,rhythmPosition}from'./atomRhythmGrid.js';import{analyzeRhythmSamples}from'./atomRhythmAnalysis.js';
test('one minute at 100 quarter-note BPM has 100 pulses with distinct 4/4, 4/8 and 4/16 measures',()=>{
 for(const[meter,beatSeconds,barSeconds,beats,bars]of[['4/4',.6,2.4,100,25],['4/8',.3,1.2,200,50],['4/16',.15,.6,400,100]]){const grid=rhythmGrid({bpm:100,meter,from:0,to:60,anchor:0});assert.equal(grid.quarterBeats,100);assert.equal(grid.beatSeconds,beatSeconds);assert.equal(grid.barSeconds,barSeconds);assert.equal(grid.beats,beats);assert.equal(grid.completeBars,bars);assert.equal(grid.partialBars,0);assert.equal(grid.events.at(-1).time<60,true);}
});
test('atom offsets, pickups and partial bars are counted without including the end boundary',()=>{
 const grid=rhythmGrid({bpm:120,meter:'3/4',from:10,to:15,anchor:10});assert.equal(grid.beats,10);assert.equal(grid.completeBars,3);assert.equal(grid.partialBars,1);assert.deepEqual(rhythmPosition(12,{bpm:120,meter:'3/4',anchor:10}),{bar:2,beat:2});assert.equal(rhythmPosition(9,{bpm:120,anchor:10}),null);
});
test('missing tempo yields no grid and very long atoms keep rendering work bounded',()=>{
 assert.equal(rhythmGrid({bpm:null,to:60}),null);assert.equal(rhythmGrid({bpm:100,meter:'0/4',to:60}),null);const grid=rhythmGrid({bpm:400,meter:'4/16',from:0,to:86400,anchor:0});assert.ok(grid.events.length<=600);assert.ok(grid.measures.length<=150);assert.equal(grid.quarterBeats,576000);
});
test('drum/bass analysis estimates tempo and absolute atom beat anchors',()=>{
 const rate=8000,length=rate*32,drums=new Float32Array(length),bass=new Float32Array(length);for(let beat=0,time=.2;time<32-.1;beat++,time+=.6){const amp=beat%4===0?1:.35;for(let i=0;i<rate*.045;i++){const at=Math.round(time*rate)+i;drums[at]=(Math.sin(i*.9)+Math.sin(i*2.1))*.3*amp*(1-i/(rate*.045));bass[at]=Math.sin(2*Math.PI*70*i/rate)*amp*.6*Math.exp(-i/(rate*.015));}}
 const result=analyzeRhythmSamples([drums,bass],rate,{offset:20});assert.ok(Math.abs(result.bpm-100)<1,JSON.stringify(result));assert.ok(Math.abs(result.beatStartSec-20.2)<.08);assert.equal(result.range.startSec,20);assert.equal(result.range.endSec,52);assert.ok(result.candidates.some(row=>row.meter==='4/4'));assert.throws(()=>analyzeRhythmSamples([new Float32Array(rate)],rate),/at least 8 seconds/);assert.throws(()=>analyzeRhythmSamples([new Float32Array(rate*10)],rate),/No steady pulse/);
});
