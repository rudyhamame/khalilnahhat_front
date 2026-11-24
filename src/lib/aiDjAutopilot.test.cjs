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
