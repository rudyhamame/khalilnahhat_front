import test from 'node:test';
import assert from 'node:assert/strict';
import {createStemRemixer,safeStemRemixPlan,REMIX_PRESETS} from './aiStemRemixer.js';
const flush=async()=>{for(let i=0;i<5;i++)await new Promise(resolve=>setImmediate(resolve));};
function fixture({ready=true,plan,grid}={}){
 let position=11,playing=true,ended=false,id='song',cancelled=0,pausedReady=ready;
 const applied=[],restored=[],statuses=[],snapshot={vocals:{volume:.8},drums:{volume:1},bass:{volume:.7},other:{volume:1}};
 const adapter={track:()=>({id,bpm:120,audioBeatGrid:grid}),ready:()=>pausedReady,playing:()=>playing,ended:()=>ended,position:()=>position,snapshot:()=>snapshot,apply:value=>applied.push(value),restore:value=>restored.push(value),status:value=>statuses.push(value),plan:plan|| (async()=>({sequence:[{preset:'instrumental',bars:4},{preset:'full',bars:4}],source:'ai'}))};
 const remix=createStemRemixer(adapter,{schedule:()=>7,cancel:()=>cancelled++});
 return {remix,applied,restored,statuses,snapshot,get cancelled(){return cancelled;},set position(value){position=value;},set playing(value){playing=value;},set ready(value){pausedReady=value;},set id(value){id=value;},set ended(value){ended=value;}};
}
test('within-song remix starts on the next bar and changes real stem gains without seeking playback',async()=>{
 const f=fixture();f.remix.start();await flush();assert.equal(f.statuses.at(-1).phase,'armed');assert.equal(f.applied.length,0);
 f.position=12;f.remix.tick();assert.equal(f.applied.at(-1).vocals,0);assert.equal(f.applied.at(-1).drums,1);
 f.position=20;f.remix.tick();assert.equal(f.applied.at(-1).vocals,1);assert.ok(f.statuses.at(-1).message.startsWith('AI'));
 f.remix.stop();assert.equal(f.restored.at(-1),f.snapshot);assert.equal(f.cancelled,1);f.remix.tick();assert.equal(f.applied.length,2);
});
test('preparation and pause preserve the original sound, then resume against the audio playhead',async()=>{
 const f=fixture({ready:false});f.remix.start();await flush();assert.equal(f.applied.length,0);assert.equal(f.statuses.at(-1).phase,'waiting');
 f.ready=true;f.playing=false;f.remix.tick();assert.equal(f.statuses.at(-1).phase,'paused');
 f.playing=true;f.remix.tick();await flush();f.position=12;f.remix.tick();assert.equal(f.applied.length,1);
 f.playing=false;f.position=22;f.remix.tick();assert.equal(f.applied.length,1);f.playing=true;f.remix.tick();assert.equal(f.applied.at(-1).vocals,1);f.remix.stop();
});
test('late AI replies and recording changes cannot apply a remix to a different song',async()=>{
 let finish;const f=fixture({plan:()=>new Promise(resolve=>{finish=resolve;})});f.remix.start();await flush();f.remix.stop();finish({sequence:[{preset:'rhythm',bars:4},{preset:'full',bars:4}],source:'ai'});await flush();assert.equal(f.applied.length,0);
 const g=fixture();g.remix.start();await flush();g.id='replacement';g.remix.tick();assert.equal(g.remix.enabled,false);assert.equal(g.applied.length,0);
});
test('seeks re-arm without seeking the media, and ending restores the manual stem mix',async()=>{
 const f=fixture();f.remix.start();await flush();f.position=12;f.remix.tick();f.position=3;f.remix.tick();assert.equal(f.statuses.at(-1).phase,'armed');assert.equal(f.restored.at(-1),f.snapshot);f.ended=true;f.remix.tick();assert.equal(f.remix.enabled,false);
});
test('untrusted plans use bounded presets and a labelled local fallback',()=>{
 assert.equal(safeStemRemixPlan({sequence:[null,null]}).source,'local');
 const fallback=safeStemRemixPlan({sequence:[{preset:'silence',bars:1}]});assert.equal(fallback.source,'local');assert.equal(fallback.sequence.at(-1).preset,'full');
 for(const preset of Object.values(REMIX_PRESETS)){const gains=['vocals','drums','bass','other'].map(key=>preset[key]);assert.ok(gains.every(value=>value>=0&&value<=1));assert.ok(gains.some(value=>value>=.5));}
});

test('remix changes align to the measured downbeat and BPM, not the metadata or time zero',async()=>{
 const f=fixture({grid:{bpm:100,tempoVerified:true,beatPhaseVerified:true,verified:true,firstDownbeat:.37}});f.position=10;f.remix.start();await flush();assert.ok(Math.abs(f.remix.timing().anchor-12.37)<1e-6);
 f.position=12.36;f.remix.tick();assert.equal(f.applied.length,0);f.position=12.37;f.remix.tick();assert.equal(f.applied.length,1);f.remix.stop();
});
