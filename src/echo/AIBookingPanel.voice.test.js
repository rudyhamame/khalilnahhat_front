import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createVoiceDraftTools} from '../lib/voiceDraftTools.js';
import {voiceConversationContext} from '../lib/aiBookingStream.mjs';
import {voiceGreetingInstructions} from '../lib/eventOrderCore.mjs';

// Run the component's real call handlers with in-memory media and provider
// adapters. No microphone, account, paid session, or network is opened.
function harness(provider){
 const slots=[],tracks=[],peers=[],sockets=[],worklets=[],requests=[],timers=new Map();
 let cursor=0,timerId=0,hangupResolve,holdHangup=false;
 const state=initial=>{const i=cursor++;if(!(i in slots))slots[i]=initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];};
 const ref=initial=>{const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];};
 const microphone=()=>{const track={enabled:true,stopped:false,stop(){this.stopped=true;}};tracks.push(track);return {getTracks:()=>[track],getAudioTracks:()=>[track]};};
 class Peer{
  constructor(){peers.push(this);}
  addTrack(){}
  createDataChannel(){return this.channel={sent:[],send(text){this.sent.push(JSON.parse(text));},close(){this.closed=true;}};}
  async createOffer(){return {sdp:'offer'};}
  async setLocalDescription(){}
  async setRemoteDescription(){this.channel.onopen();}
  close(){this.closed=true;}
 }
 class Socket{
  constructor(){this.readyState=1;this.sent=[];sockets.push(this);}
  send(text){this.sent.push(JSON.parse(text));}
  close(){this.closed=true;}
 }
 class Context{
  constructor(){this.audioWorklet={addModule:async()=>{}};}
  resume(){return Promise.resolve();}
  close(){this.closed=true;return Promise.resolve();}
  createAnalyser(){return {connect(){},disconnect(){}};}
  createGain(){return {connect(){}};}
  createMediaStreamSource(){return {connect(){},disconnect(){}};}
 }
 class Worklet{constructor(){this.port={};worklets.push(this);}disconnect(){this.disconnected=true;}}
 const fetch=async(url,options)=>{
  requests.push({url,body:JSON.parse(options.body)});
  if(url.endsWith('/end')){
   if(holdHangup)return new Promise(resolve=>{hangupResolve=()=>resolve({ok:true});});
   return {ok:true};
  }
  return {ok:true,json:async()=>({callId:'call-'+requests.length,sdp:'answer',wsTicket:'ticket'})};
 };
 const context={useState:state,useRef:ref,useCallback:fn=>fn,useEffect(){},useRentalCatalog:()=>({equipment:[]}),useEventOrder:()=>null,
  createVoiceDraftTools,voiceConversationContext,voiceGreetingInstructions,apiBaseUrl:'https://unit.invalid/api',
  fetch,navigator:{mediaDevices:{getUserMedia:async()=>microphone()}},window:{isSecureContext:true,RTCPeerConnection:Peer,AudioContext:provider==='alibaba'?Context:undefined,AudioWorkletNode:Worklet,location:{href:'https://unit.invalid/'},dispatchEvent(){}},
  RTCPeerConnection:Peer,AudioWorkletNode:Worklet,WebSocket:Socket,Audio:class{pause(){this.paused=true;}},
  AbortController,Blob,URL,crypto,CustomEvent:class{},btoa,atob,console,
  setTimeout(fn){timers.set(++timerId,fn);return timerId;},clearTimeout(id){timers.delete(id);},
 };
 let source=fs.readFileSync(new URL('./AIBookingPanel.jsx',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default function','function');
 source=source.slice(0,source.indexOf('  if(!user||!token)return <OrderSignIn'))+'return {startCall,stopCall,pauseCall,toggleMic,applyStatus,setMode,append,call,micMuted,error};\n}';
 const Component=vm.runInNewContext(source+';AIBookingPanel',context);
 const render=()=>{cursor=0;return Component({ar:false,user:{id:'user'},token:'unit-token',onReview(){}});};
 let controls=render();controls.applyStatus({configured:true,policy:{voice:{provider,enabled:true},chat:{enabled:true}}});controls.setMode('voice');
 const start=async()=>{await render().startCall();if(provider==='alibaba')sockets.at(-1).onmessage({data:JSON.stringify({type:'bridge.ready'})});return render();};
 return {render,start,tracks,peers,sockets,worklets,requests,timers,holdEnd(){holdHangup=true;},finishEnd(){holdHangup=false;hangupResolve();},pcm(){worklets.at(-1).port.onmessage({data:new Int16Array([1,2,3]).buffer});},channel:()=>provider==='alibaba'?sockets.at(-1):peers.at(-1).channel};
}
for(const provider of ['openai','alibaba']){
 test(`${provider}: mute keeps the call open; pause releases it; resume waits for hangup and keeps context`,async()=>{
  const h=harness(provider);let voice=await h.start();assert.equal(voice.call,'active');
  if(provider==='alibaba'){h.pcm();assert.equal(h.channel().sent.filter(e=>e.type==='input_audio_buffer.append').length,1);}
  voice.toggleMic();voice=h.render();assert.equal(voice.micMuted,true);assert.equal(h.tracks[0].enabled,false);assert.equal(h.tracks[0].stopped,false);
  if(provider==='alibaba'){h.pcm();assert.equal(h.channel().sent.filter(e=>e.type==='input_audio_buffer.append').length,1);}
  voice.toggleMic();assert.equal(h.tracks[0].enabled,true);
  if(provider==='alibaba'){h.pcm();assert.equal(h.channel().sent.filter(e=>e.type==='input_audio_buffer.append').length,2);}
  voice=h.render();voice.append({role:'user',content:'My event is in Toronto.'},false);voice.toggleMic();
  h.holdEnd();const paused=h.render().pauseCall();voice=h.render();assert.equal(voice.call,'paused');assert.equal(h.tracks[0].stopped,true);assert.equal(h.channel().closed,true);assert.equal(h.requests.at(-1).body.callId,'call-1');
  if(provider==='alibaba'){const count=h.channel().sent.length;h.pcm();assert.equal(h.channel().sent.length,count);assert.equal(h.worklets[0].disconnected,true);}
  const resume=h.start();await Promise.resolve();assert.equal(h.tracks.length,1,'resume must wait for the old provider session to end');
  h.finishEnd();await paused;voice=await resume;assert.equal(voice.call,'active');assert.equal(h.tracks.length,2);assert.equal(h.tracks[1].enabled,false,'paused mute preference survives reconnect');
  const context=h.channel().sent.find(e=>e.type==='conversation.item.create');assert.match(JSON.stringify(context),/My event is in Toronto/);assert.match(h.channel().sent.find(e=>e.type==='response.create').response.instructions,/resumed a paused call/);
  voice.stopCall();voice=h.render();assert.equal(voice.call,'idle');assert.equal(voice.micMuted,false);assert.equal(h.tracks[1].stopped,true);
 });
 test(`${provider}: stop during a pending resume never acquires another microphone`,async()=>{
  const h=harness(provider);await h.start();h.holdEnd();const paused=h.render().pauseCall();const resume=h.render().startCall();h.render().stopCall();h.finishEnd();await Promise.all([paused,resume]);assert.equal(h.tracks.length,1);assert.equal(h.render().call,'idle');
 });
}
