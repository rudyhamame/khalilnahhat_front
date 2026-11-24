const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const flush=async()=>{for(let i=0;i<10;i++)await new Promise(resolve=>setImmediate(resolve));};
function harness(play){
 const events=[],timers=[];const a={id:'a',title:'First'},b={id:'b',title:'Next'};
 const source=fs.readFileSync(__dirname+'/aiDjAutopilot.js','utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const create=vm.runInNewContext(source+';createAiDjAutopilot',{setTimeout:fn=>{timers.push(fn);},performance:{now:()=>100},trackBpm:()=>120,nextPhraseStart:()=>({startAt:0,duration:.1})});
 const conductor=create({status:value=>events.push(['status',value]),library:()=>[a,b],deck:n=>({track:n===1?a:b,position:()=>100,duration:()=>300,rate:()=>1}),plan:async()=>({nextTrackId:'b',transitionBars:8,cueSeconds:0}),load:async()=>true,rate(){},play,pause:n=>events.push(['pause',n]),crossfader:value=>events.push(['crossfader',value]),bass(){}});
 return {conductor,events,timers};
}
test('a next deck that fails to start cannot fade or pause the current song',async()=>{
 const h=harness(async()=>false);h.conductor.start();await flush();assert.ok(h.events.some(([name,value])=>name==='status'&&value.phase==='waiting'));assert.ok(!h.events.some(([name])=>name==='crossfader'||name==='pause'));h.conductor.stop();
});
test('stopping Auto DJ during a pending play cannot later start a stray mix',async()=>{
 let resolve;const h=harness(()=>new Promise(done=>{resolve=done;}));h.conductor.start();await flush();h.conductor.stop();resolve(true);await flush();assert.ok(!h.events.some(([name])=>name==='crossfader'));assert.ok(h.events.some(([name,deck])=>name==='pause'&&deck===2));
});
test('audio analysis supplies real BPM and first-beat cue offsets before automatic deck matching',async()=>{
 const {trackBpm}=await import('./aiDjPlanner.js');const source=fs.readFileSync(__dirname+'/aiDjAutopilot.js','utf8').replace(/^import .*;\n/gm,'').replace('export function','function');
 const events=[],tracks={1:{id:'a',bpm:120},2:{id:'b',bpm:140}};
 const create=vm.runInNewContext(source+';createAiDjAutopilot',{setTimeout(){},performance:{now:()=>0},trackBpm,nextPhraseStart:options=>{events.push(['schedule',options]);return {startAt:200,duration:16};}});
 const conductor=create({status(){},library:()=>Object.values(tracks),deck:n=>({track:tracks[n],position:()=>10,duration:()=>300,rate:()=>1}),
  analyze:async n=>{tracks[n].audioBeatGrid={bpm:n===1?100:110,tempoVerified:true,beatPhaseVerified:true,verified:true,firstDownbeat:n===1?.25:.37,analyzedFrom:0,analyzedTo:300};events.push(['analyze',n]);},
  plan:async state=>{events.push(['plannedBpm',state.current.bpm]);return {nextTrackId:'b',transitionBars:8,cueSeconds:0,targetBpm:120};},load:async()=>true,
  rate:(n,value)=>events.push(['rate',n,value]),cue:(n,value)=>events.push(['cue',n,value]),play:async()=>true,pause(){},crossfader(){},bass(){}});
 conductor.start();await flush();assert.ok(events.some(row=>row[0]==='plannedBpm'&&row[1]===100));assert.ok(events.some(row=>row[0]==='rate'&&Math.abs(row[2]-100/110)<1e-6));assert.ok(events.some(row=>row[0]==='cue'&&row[2]===.37));
 const timing=events.find(row=>row[0]==='schedule')[1];assert.equal(timing.bpm,100);assert.equal(timing.firstDownbeat,.25);assert.equal(timing.gridVerified,true);conductor.stop();
});
