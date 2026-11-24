import test from 'node:test';
import assert from 'node:assert/strict';
import {channelTrimTarget,createDjAutoTrim,trimDecibels,trimValue,trimGain} from './djAutoTrim.js';

test('trim conversion matches the physical channel knob, with finite bounded gain',()=>{
 assert.equal(trimGain(0),1);assert.equal(trimGain(1),4);assert.equal(trimGain(-1),.25);assert.equal(trimGain(NaN),1);
 for(const db of [-12,-6,0,3,6,12])assert.ok(Math.abs(trimDecibels(trimValue(db))-db)<1e-8);
});
test('level matching is peak-aware, bounded and refuses to boost silence or a muted master',()=>{
 const quiet={rms:.02,peak:.04,outputPeak:.04,currentDb:0,master:1};assert.equal(channelTrimTarget(quiet),6);
 assert.ok(channelTrimTarget({...quiet,outputPeak:2})<-6);
 assert.equal(channelTrimTarget({...quiet,rms:0,peak:0}),null);assert.equal(channelTrimTarget({...quiet,rms:NaN}),null);assert.equal(channelTrimTarget({...quiet,master:0}),null);
 assert.equal(channelTrimTarget({...quiet,rms:2,peak:3,outputPeak:3}),-12);
});
test('master attenuation stays intentional rather than being compensated away',()=>{
 const level={rms:.1,peak:.2,outputPeak:.2,currentDb:0,master:1};const full=channelTrimTarget(level),half=channelTrimTarget({...level,master:.5});assert.ok(Math.abs(full-half-6.0205999)<1e-5);
});
function fixture(){
 const writes=[],changes=[],statuses=[];let cancelled=0,master=1;
 function channel(n,amplitude){
  const strip={trim:{gain:{value:1}},context:{state:'running'},set(name,value,smoothing){assert.equal(name,'trim');this.trim.gain.value=trimGain(value);writes.push({n,value,smoothing});}};
  const state={strip,trackId:'song'+n,manualTrim:0,playing:true,amplitude};
  strip.inputMeter={getFloatTimeDomainData:array=>{array.fill(state.amplitude);array[0]=state.amplitude*2;}};
  strip.trimMeter={getFloatTimeDomainData:array=>{array.fill(state.amplitude*strip.trim.gain.value);array[0]=state.amplitude*2*strip.trim.gain.value;}};
  return state;
 }
 const channels={1:channel(1,.05),2:channel(2,.3)};
 const control=createDjAutoTrim({channel:n=>channels[n],master:()=>master,changed:(n,value)=>changes.push({n,value}),status:message=>statuses.push(message)},{schedule:()=>10,cancel:id=>{assert.equal(id,10);cancelled++;}});
 return {control,channels,writes,changes,statuses,set master(value){master=value;},get cancelled(){return cancelled;}};
}
test('independent audible deck trims warm up and move smoothly, then restore manual values',()=>{
 const f=fixture();f.control.start();for(let i=0;i<7;i++)f.control.tick();assert.equal(f.writes.length,0);
 for(let i=0;i<60;i++)f.control.tick();assert.ok(f.changes.some(change=>change.n===1&&change.value>0));assert.ok(f.changes.some(change=>change.n===2&&change.value<0));
 assert.ok(f.writes.every(write=>trimDecibels(write.value)<=6&&trimDecibels(write.value)>=-12&&write.smoothing>=.2));
 f.control.stop();assert.equal(f.channels[1].strip.trim.gain.value,1);assert.equal(f.channels[2].strip.trim.gain.value,1);assert.equal(f.cancelled,1);
 const count=f.writes.length;f.control.tick();f.control.stop();assert.equal(f.writes.length,count);
});
test('manual override holds one deck while other decks stay automatic, and can be resumed',()=>{
 const f=fixture();f.control.start();for(let i=0;i<20;i++)f.control.tick();f.control.manual(1);f.channels[1].strip.set('trim',.1,.015);
 const count=f.writes.filter(write=>write.n===1).length;for(let i=0;i<20;i++)f.control.tick();assert.equal(f.writes.filter(write=>write.n===1).length,count);
 f.control.resume(1);for(let i=0;i<20;i++)f.control.tick();assert.ok(f.writes.filter(write=>write.n===1).length>count);f.control.stop();
});
test('stopping automation never overwrites a channel taken over manually',()=>{
 const f=fixture();f.control.start();for(let i=0;i<10;i++)f.control.tick();f.control.manual(1);f.channels[1].strip.set('trim',.2,.015);const gain=f.channels[1].strip.trim.gain.value;f.control.stop();assert.equal(f.channels[1].strip.trim.gain.value,gain);
});
test('silence, paused decks and suspended audio cannot trigger trim changes',()=>{
 const f=fixture();f.channels[1].amplitude=0;f.channels[2].playing=false;f.control.start();for(let i=0;i<20;i++)f.control.tick();assert.equal(f.writes.length,0);
 f.channels[1].amplitude=.05;f.channels[1].strip.context.state='suspended';for(let i=0;i<20;i++)f.control.tick();assert.equal(f.writes.length,0);f.control.stop();
});
test('a new recording resets the previous analysis before making new corrections',()=>{
 const f=fixture();f.control.start();for(let i=0;i<20;i++)f.control.tick();f.channels[1].trackId='new-song';f.control.tick();assert.equal(f.writes.filter(write=>write.n===1).at(-1).value,0);
 const count=f.writes.filter(write=>write.n===1).length;for(let i=0;i<5;i++)f.control.tick();assert.equal(f.writes.filter(write=>write.n===1).length,count);f.control.stop();
});
