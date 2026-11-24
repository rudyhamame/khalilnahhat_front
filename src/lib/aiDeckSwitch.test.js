import test from 'node:test';
import assert from 'node:assert/strict';
import {createAiDeckSwitch} from './aiDeckSwitch.js';
const flush=async()=>{for(let i=0;i<8;i++)await new Promise(resolve=>setImmediate(resolve));};
function harness({second=true}={}){
 const events=[],positions={1:20,2:30},playing={1:true,2:false},tracks={1:{id:'a',bpm:120},2:second?{id:'b',bpm:120}:null};let tick,interval=8;
 const dj=createAiDeckSwitch({status:state=>events.push(['status',state]),mixAfter:()=>interval,library:()=>[{id:'a',bpm:120},{id:'b',bpm:120}],plan:async()=>({nextTrackId:'b'}),
  load:async(n,track)=>{events.push(['load',n]);tracks[n]=track;return true;},analyze:async()=>{},deck:n=>tracks[n]?{track:tracks[n],position:()=>positions[n],duration:()=>300,rate:()=>1,playing:()=>playing[n],ended:()=>positions[n]>=300}:null,
  cue:(n,time)=>{events.push(['cue',n,time]);positions[n]=time;return true;},play:async n=>{events.push(['play',n]);playing[n]=true;return true;},pause:n=>{events.push(['pause',n]);playing[n]=false;},rate(){},crossfader:value=>events.push(['fader',value]),
 },{schedule:fn=>{tick=fn;return 1;},cancel(){}});
 return {dj,events,positions,playing,tracks,tick:()=>tick(),interval:value=>{interval=value;}};
}
test('both decks start at zero, then cut repeatedly between endpoints without seeking, pausing or reloading',async()=>{
 const h=harness();h.dj.start();await flush();assert.deepEqual(h.events.filter(e=>e[0]==='cue'),[['cue',1,0],['cue',2,0]]);assert.equal(h.playing[1],true);assert.equal(h.playing[2],true);
 const before=h.events.length;
 for(const time of [8,16,24]){h.positions[1]=time;h.positions[2]=time;h.tick();}
 assert.deepEqual(h.events.filter(e=>e[0]==='fader').map(e=>e[1]),[0,1,0,1]);assert.ok(!h.events.slice(before).some(e=>['pause','load','cue','play'].includes(e[0])));h.dj.stop();
});
test('an empty second deck is loaded once and keeps its recording on return cuts',async()=>{
 const h=harness({second:false});h.dj.start();await flush();for(const time of [8,16]){h.positions[1]=time;h.positions[2]=time;h.tick();}assert.equal(h.events.filter(e=>e[0]==='load').length,1);assert.equal(h.tracks[2].id,'b');h.dj.stop();
});
test('ending or manually pausing a deck leaves the other audible and stops switching',async()=>{
 const h=harness();h.dj.start();await flush();h.positions[1]=300;h.tick();assert.equal(h.dj.enabled,false);assert.deepEqual(h.events.filter(e=>e[0]==='fader').at(-1),['fader',1]);assert.equal(h.playing[2],true);
 const paused=harness();paused.dj.start();await flush();paused.playing[2]=false;paused.tick();assert.equal(paused.dj.enabled,false);assert.deepEqual(paused.events.filter(e=>e[0]==='fader').at(-1),['fader',0]);
});
test('stop during analysis cannot later reset or start either deck',async()=>{
 let resolve;const events=[];const dj=createAiDeckSwitch({status(){},deck:n=>({track:{id:String(n),bpm:120}}),analyze:()=>new Promise(done=>{resolve=done;}),pause:()=>events.push('pause'),cue:()=>events.push('cue'),play:()=>events.push('play')});dj.start();await flush();dj.stop();resolve();await flush();assert.deepEqual(events,[]);
});
