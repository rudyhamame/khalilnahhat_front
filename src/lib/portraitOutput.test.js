import test from 'node:test';
import assert from 'node:assert/strict';
import {connectPortraitOutput} from './portraitOutput.js';

function fixture(){
 const signals=[],handlers={};let attached=0,removed=0,connections=0;
 const video=new EventTarget();Object.assign(video,{readyState:0,play:async()=>{}});
 const audio={kind:'audio',attach(){attached++;return {remove(){removed++;}};},detach(){}};
 const room={on(event,callback){handlers[event]=callback;},async connect(){connections++;handlers.subscribed(audio,{}, {identity:'audience'});handlers.subscribed(audio,{}, {identity:'khalil-broadcaster'});},async startAudio(){}};
 const options={room,events:{TrackSubscribed:'subscribed',TrackUnsubscribed:'unsubscribed',Disconnected:'disconnected'},params:new URLSearchParams({url:'wss://media.example',token:'private-recorder-token'}),video,logo:{async decode(){}},audioRoot:{append(){}},signal:value=>signals.push(value)};
 return {options,signals,handlers,audio,video,get attached(){return attached;},get removed(){return removed;},get connections(){return connections;}};
}
test('portrait output starts after media and logo are ready, receives original broadcaster audio, and ends on disconnect',async()=>{
 const f=fixture();await connectPortraitOutput(f.options);
 assert.equal(f.attached,1);assert.deepEqual(f.signals,['START_RECORDING']);
 f.video.dispatchEvent(new Event('loadeddata'));assert.equal(f.signals.length,1);
 f.handlers.disconnected();assert.deepEqual(f.signals,['START_RECORDING','END_RECORDING']);assert.equal(f.removed,1);
 assert.ok(!f.signals.join(' ').includes('private-recorder-token'));
});
test('missing connection parameters do not connect or signal a successful output',async()=>{
 const f=fixture();await assert.rejects(connectPortraitOutput({...f.options,params:new URLSearchParams()}),/missing/);
 assert.equal(f.connections,0);assert.deepEqual(f.signals,[]);
});
test('a missing brand asset prevents the recorder from capturing an unbranded output',async()=>{
 const f=fixture();await assert.rejects(connectPortraitOutput({...f.options,logo:{decode:async()=>{throw new Error('Image unavailable');}}}),/unavailable/);
 assert.equal(f.connections,0);assert.deepEqual(f.signals,[]);
});
test('portrait output follows the broadcaster crop position and ignores everyone else',async()=>{
 const f=fixture();f.options.events.DataReceived='data';f.video.style={};await connectPortraitOutput(f.options);
 const message=x=>new TextEncoder().encode(JSON.stringify({t:'portrait-pan',x}));
 f.handlers.data(message(.25),{identity:'khalil-broadcaster'});assert.equal(f.video.style.objectPosition,'25% 50%');
 f.handlers.data(message(.9),{identity:'audience'});assert.equal(f.video.style.objectPosition,'25% 50%');
 f.handlers.data(message(7),{identity:'khalil-broadcaster'});assert.equal(f.video.style.objectPosition,'100% 50%');
 f.handlers.data(new TextEncoder().encode('not json'),{identity:'khalil-broadcaster'});assert.equal(f.video.style.objectPosition,'100% 50%');
});
test('a dedicated portrait source replaces the landscape picture, in either arrival order',async()=>{
 const attached=[];const mk=name=>({kind:'video',name,attach(){attached.push(name);},detach(){}});
 const landscape=mk('landscape'),portrait=mk('portrait'),handlers={};const video=new EventTarget();Object.assign(video,{readyState:0,play:async()=>{}});
 const room={on(e,cb){handlers[e]=cb;},async connect(){},async startAudio(){}};
 await connectPortraitOutput({room,events:{TrackSubscribed:'s',TrackUnsubscribed:'u',Disconnected:'d'},params:new URLSearchParams({url:'wss://m.example',token:'t'}),video,logo:{async decode(){}},audioRoot:{append(){}},signal(){}});
 const broadcaster={identity:'khalil-broadcaster'};
 handlers.s(landscape,{trackName:'camera'},broadcaster);handlers.s(portrait,{trackName:'portrait-source'},broadcaster);
 assert.deepEqual(attached,['landscape','portrait']);
 handlers.s(mk('late-landscape'),{trackName:'camera'},broadcaster);assert.deepEqual(attached,['landscape','portrait']);
 handlers.u(portrait);handlers.s(mk('after'),{trackName:'camera'},broadcaster);assert.equal(attached.at(-1),'after');
});
