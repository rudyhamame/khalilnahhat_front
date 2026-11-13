import test from 'node:test';import assert from 'node:assert/strict';
import {createStudioVoiceTuner} from './studioVoiceTune.js';
function fixture({pending,fail=false}={}){
 const contexts=[],processors=[],routed=[],statuses=[];
 class Context{constructor(options){assert.equal(options.latencyHint,0);contexts.push(this);}resume(){return Promise.resolve();}close(){this.closed=true;return Promise.resolve();}}
 class Processor{constructor(settings){this.settings=settings;processors.push(this);}async init({track}){this.raw=track;if(pending)await pending;if(fail)throw Error('Worklet failed');this.processedTrack={id:'tuned-'+track.id};}configure(settings){this.settings=settings;}async destroy(){this.destroyed=true;}}
 const tuner=createStudioVoiceTuner({AudioContextClass:Context,ProcessorClass:Processor,onTrack:track=>routed.push(track),onStatus:status=>statuses.push(status)});
 return {tuner,contexts,processors,routed,statuses};
}
test('tuning processes only the borrowed voice and bypasses without stopping it',async()=>{
 const f=fixture(),raw={id:'voice',stop(){throw Error('Borrowed track must stay live');}};
 await f.tuner.setInput(raw);assert.equal(f.contexts.length,0);assert.equal(f.tuner.track,raw);
 await f.tuner.configure({enabled:true});assert.equal(f.tuner.track.id,'tuned-voice');assert.equal(f.processors[0].raw,raw);
 await f.tuner.configure({enabled:true,key:9,scale:'minor'});assert.equal(f.processors.length,1);assert.equal(f.processors[0].settings.key,9);
 await f.tuner.configure({enabled:false});assert.equal(f.tuner.track,raw);assert.ok(f.contexts[0].closed);assert.ok(f.processors[0].destroyed);
 f.tuner.stop();assert.equal(f.tuner.track,null);
});
test('late worklet initialization cannot reconnect a stopped or replaced microphone',async()=>{
 let resolve;const f=fixture({pending:new Promise(done=>{resolve=done;})});await f.tuner.configure({enabled:true});const loading=f.tuner.setInput({id:'old'});await Promise.resolve();f.tuner.stop();resolve();await loading;
 assert.equal(f.tuner.track,null);assert.equal(f.routed.at(-1),null);assert.ok(f.contexts[0].closed);assert.ok(f.processors[0].destroyed);
});
test('failed worklet falls back to the natural voice with an honest status',async()=>{
 const f=fixture({fail:true}),raw={id:'voice'};await f.tuner.setInput(raw);await f.tuner.configure({enabled:true});
 assert.equal(f.tuner.track,raw);assert.match(f.statuses.at(-1),/natural voice is still active/);assert.ok(f.contexts[0].closed);
});
