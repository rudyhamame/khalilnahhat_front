import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSpeechDictation} from './speechDictation.js';
function fixture(){
 const engines=[],texts=[],states=[],errors=[],timers=new Map();let id=0;
 class Recognition{constructor(){engines.push(this);}start(){this.started=true;this.onstart?.();}stop(){this.stopped=true;}abort(){this.aborted=true;}}
 const client=createSpeechDictation({Recognition,onText:text=>texts.push(text),onState:state=>states.push(state),onError:error=>errors.push(error),setTimer:(fn,ms)=>{timers.set(++id,{fn,ms});return id;},clearTimer:key=>timers.delete(key)});
 const result=(engine,words)=>engine.onresult?.({results:words.map(transcript=>[{transcript}])});
 return {client,engines,texts,states,errors,timers,result};
}
test('dictation appends to typed text, replaces interim hypotheses, and honors language',()=>{
 const f=fixture();f.client.start({text:'My event:',lang:'ar-SA'});const engine=f.engines[0];
 assert.equal(engine.lang,'ar-SA');assert.equal(engine.interimResults,true);
 f.result(engine,['مرحبا']);f.result(engine,['مرحبا بكم','في الحفل']);
 assert.equal(f.texts.at(-1),'My event: مرحبا بكم في الحفل');assert.equal(f.states.at(-1),'listening');
 f.client.stop();assert.equal(engine.stopped,true);engine.onend();assert.equal(f.states.at(-1),'idle');assert.equal(f.timers.size,0);
});
test('cancel stops the microphone and rejects queued results from that session',()=>{
 const f=fixture();f.client.start();const old=f.engines[0],queued=old.onresult;f.result(old,['first']);f.client.cancel();
 assert.equal(old.aborted,true);const count=f.texts.length;queued({results:[[{transcript:'late'}]]});assert.equal(f.texts.length,count);
 assert.equal(f.client.start({text:'next'}),true);f.result(f.engines[1],['message']);assert.equal(f.texts.at(-1),'next message');
 f.client.dispose();
});
test('permission failure preserves the existing message and reports the error',()=>{
 const f=fixture();f.client.start({text:'Keep this message'});f.engines[0].onerror({error:'not-allowed'});
 assert.equal(f.errors.at(-1),'not-allowed');assert.equal(f.texts.at(-1),'Keep this message');assert.equal(f.states.at(-1),'idle');assert.equal(f.engines[0].aborted,true);
});
test('dispose aborts recording without updates to an unmounted composer',()=>{
 const f=fixture();f.client.start();const count=f.states.length,engine=f.engines[0],late=engine.onend;f.client.dispose();late();
 assert.equal(engine.aborted,true);assert.equal(f.states.length,count);assert.equal(f.client.start(),false);assert.equal(f.timers.size,0);
});
test('dictation is bounded by message length and microphone timeout',()=>{
 const f=fixture();f.client.start();f.result(f.engines[0],['x'.repeat(2200)]);assert.equal(f.texts.at(-1).length,2000);assert.equal(f.engines[0].aborted,true);
 f.client.start();const timer=[...f.timers.values()].find(item=>item.ms===90000);assert.ok(timer);timer.fn();assert.equal(f.engines[1].aborted,true);assert.equal(f.states.at(-1),'idle');
});
test('a second start cannot overlap a current microphone session',()=>{
 const f=fixture();assert.equal(f.client.start(),true);assert.equal(f.client.start(),false);assert.equal(f.engines.length,1);f.client.dispose();
});
