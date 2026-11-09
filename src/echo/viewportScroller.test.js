import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createViewportScroller} from './viewportScroller.js';

function setup(){
 let position=0,time=0,sequence=0,reduced=false,blocked=false;
 const frames=new Map(),writes=[],finished=[];
 const mover=createViewportScroller({read:()=>position,write:value=>{position=value;writes.push(value);},now:()=>time,viewportHeight:()=>800,
  requestFrame:callback=>{frames.set(++sequence,callback);return sequence;},cancelFrame:id=>frames.delete(id),reducedMotion:()=>reduced,blocked:()=>blocked,onFinish:reason=>finished.push(reason)});
 const step=(ms=1000/60)=>{time+=ms;const callbacks=[...frames.values()];frames.clear();callbacks.forEach(callback=>callback(time));};
 const settle=(ms=1000/60)=>{let count=0;while(frames.size&&count++<1000)step(ms);assert.ok(count<1000,'motion must converge');};
 return{mover,frames,writes,finished,step,settle,get position(){return position;},get time(){return time;},reduce:()=>{reduced=true;},block:()=>{blocked=true;}};
}
test('a chapter move accelerates, brakes, and finishes exactly without overshooting',()=>{
 const s=setup();s.mover.navigate(()=>800);s.settle();
 const deltas=s.writes.map((value,i)=>value-(s.writes[i-1]||0));
 assert.ok(deltas[2]>deltas[0]);assert.ok(Math.max(...deltas)>deltas.at(-3)*5);
 assert.ok(s.writes.every((value,i)=>value>=0&&value<=800&&(!i||value>=s.writes[i-1])));
 assert.equal(s.position,800);assert.deepEqual(s.finished,['complete']);
});
test('rapid clicks retarget one animation from its current position',()=>{
 const s=setup();s.mover.navigate(()=>5000);for(let i=0;i<12;i++)s.step();
 const before=s.position;s.mover.navigate(()=>3200);s.mover.navigate(()=>1600);
 assert.equal(s.position,before);assert.equal(s.frames.size,1);s.step();assert.ok(Math.abs(s.position-before)<100);
 s.settle();assert.equal(s.position,1600);
});
test('reversing direction brakes and reaches Home without stale frames winning',()=>{
 const s=setup();s.mover.navigate(()=>5000);for(let i=0;i<20;i++)s.step();
 s.mover.navigate(()=>0);s.settle();assert.equal(s.position,0);assert.equal(s.frames.size,0);
});
test('a layout shift updates the goal during the existing animation without a jump',()=>{
 const s=setup();let goal=900;s.mover.navigate(()=>goal);for(let i=0;i<10;i++)s.step();
 const before=s.position;goal=1800;s.mover.refresh(()=>goal);assert.equal(s.position,before);
 s.step();assert.ok(Math.abs(s.position-before)<100);s.settle();assert.equal(s.position,1800);
});
test('reduced motion lands immediately and completes even with no pending frame',()=>{
 const s=setup();s.reduce();s.mover.navigate(()=>1200);assert.equal(s.position,1200);assert.equal(s.frames.size,0);assert.deepEqual(s.finished,['complete']);
});
test('already aligned navigation completes instead of leaving the nav in transit',()=>{
 const s=setup();s.mover.navigate(()=>0);assert.deepEqual(s.finished,['complete']);assert.equal(s.mover.running,false);
});
test('an open modal or removed target stops motion and leaves no stale work',()=>{
 const s=setup();s.mover.navigate(()=>800);s.step();s.block();const before=s.position;s.step();assert.equal(s.position,before);assert.equal(s.frames.size,0);assert.deepEqual(s.finished,['cancelled']);
 const removed=setup();let goal=800;removed.mover.navigate(()=>goal);removed.step();goal=NaN;removed.step();assert.equal(removed.frames.size,0);assert.ok(removed.writes.every(Number.isFinite));
});
test('cleanup cancels the pending frame',()=>{
 const s=setup();s.mover.navigate(()=>5000);s.step();s.mover.cancel();const position=s.position;s.step();assert.equal(s.position,position);assert.equal(s.frames.size,0);
});
test('long trips have bounded speed and converge across refresh rates',()=>{
 const durations=[];
 for(const fps of [30,60,120]){
  const s=setup(),dt=1000/fps;s.mover.navigate(()=>6000);s.settle(dt);assert.equal(s.position,6000);
  assert.ok(s.writes.every((value,i)=>Math.abs(value-(s.writes[i-1]||0))<4000/fps+1));durations.push(s.time);
 }
 assert.ok(Math.max(...durations)-Math.min(...durations)<250);
});
