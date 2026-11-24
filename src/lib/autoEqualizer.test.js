import test from 'node:test';
import assert from 'node:assert/strict';
import {autoEqualizerTarget,startAutoEqualizer} from './autoEqualizer.js';
import {EQUALIZER_BANDS,flatEqualizer} from './audioEqualizer.js';
const spectrum=()=>Float32Array.from({length:2048},(_,i)=>-35-10*Math.log10(Math.max(1,i)));
test('auto EQ detects excessive bass, stays gentle and ignores silence',()=>{
 const bins=spectrum();for(let i=3;i<22;i++)bins[i]+=20;
 const values=autoEqualizerTarget(bins,48000,4096);
 assert.ok(values.bass<0);assert.ok(Object.values(values).every(value=>Math.abs(value)<=3));
 assert.equal(autoEqualizerTarget(new Float32Array(2048).fill(-Infinity),48000,4096),null);
 assert.equal(autoEqualizerTarget(new Float32Array(2048).fill(NaN),48000,4096),null);
});
function fixture(){
 const writes=[],changes=[],statuses=[],connections=[],levels=[];let tick,cancelled=0,silent=false;
 const analyser={fftSize:0,frequencyBinCount:2048,getFloatTimeDomainData:array=>array.fill(silent?0:.15),getFloatFrequencyData:array=>array.set(spectrum()),disconnect(){connections.push('released analyser');}};
 const graph={context:{state:'running',currentTime:0,sampleRate:48000,createAnalyser:()=>analyser},mixInput:{gain:{value:1,setTargetAtTime:value=>levels.push(value)},connect:node=>connections.push(node),disconnect:node=>connections.push(['disconnect',node])},filters:Object.fromEntries(EQUALIZER_BANDS.map(band=>[band.key,{gain:{setTargetAtTime:(value,time,smoothing)=>writes.push({band:band.key,value,time,smoothing})}}]))};
 const stop=startAutoEqualizer({graph,base:{...flatEqualizer(),bass:1},onChange:values=>changes.push(values),onStatus:text=>statuses.push(text),schedule:fn=>{tick=fn;return 7;},cancel:id=>{assert.equal(id,7);cancelled++;}});
 return {graph,changes,writes,statuses,connections,levels,analyser,stop,get cancelled(){return cancelled;},silent:()=>{silent=true;},tick:()=>{graph.context.currentTime+=.25;tick();}};
}
test('automatic corrections reach real filter parameters without a second audible path; stopping restores manual values',()=>{
 const f=fixture();for(let i=0;i<50;i++)f.tick();
 assert.ok(f.changes.length>0);assert.ok(f.writes.some(write=>Math.abs(write.value)>0));
 assert.ok(f.levels.every(level=>level<=1&&level>0));
 assert.equal(f.connections.length,1);assert.equal(f.connections[0],f.analyser);
 assert.ok(f.statuses.at(-1).includes('active'));assert.ok(f.writes.every(write=>write.smoothing>.1));
 f.stop();assert.equal(f.levels.at(-1),1);assert.equal(f.cancelled,1);assert.equal(f.changes.at(-1).bass,1);assert.deepEqual(f.connections[1],['disconnect',f.analyser]);
 const count=f.writes.length;f.tick();f.stop();assert.equal(f.writes.length,count);assert.equal(f.cancelled,1);
});
test('silence and suspended contexts never boost or restart playback',()=>{
 const f=fixture();f.silent();for(let i=0;i<12;i++)f.tick();assert.equal(f.writes.length,0);assert.ok(f.statuses.at(-1).includes('waiting'));
 f.graph.context.state='suspended';f.tick();assert.equal(f.writes.length,0);f.stop();
});
