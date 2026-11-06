import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createVoiceDraftTools} from '../lib/voiceDraftTools.js';
import {voiceConversationContext} from '../lib/aiBookingStream.mjs';
import {createBookingConversationRecorder} from '../lib/bookingConversationRecorder.js';
import {voiceGreetingInstructions,voiceGreetingText,aiFields,aiOrderContext,decodePatchValue,validValue,getPath} from '../lib/eventOrderCore.mjs';

// Run the component's real call handlers with in-memory media and provider
// adapters. No microphone, account, paid session, or network is opened.
function harness(provider,{orderDraft=null,replyData=null,navigationShown=true}={}){
 const navigation=[],slots=[],captures=[],recognizers=[],utterances=[],tracks=[],peers=[],sockets=[],worklets=[],requests=[],tones=[],timers=new Map(),delays=new Map();
 let cursor=0,timerId=0,hangupResolve,holdHangup=false;
 const state=initial=>{const i=cursor++;if(!(i in slots))slots[i]=typeof initial==='function'?initial():initial;return [slots[i],value=>{slots[i]=typeof value==='function'?value(slots[i]):value;}];};
 const ref=initial=>{const i=cursor++;if(!(i in slots))slots[i]={current:initial};return slots[i];};
 const microphone=()=>{const track={enabled:true,stopped:false,contentHint:'',kind:'audio',readyState:'live',stop(){this.stopped=true;}};tracks.push(track);return {getTracks:()=>[track],getAudioTracks:()=>[track]};};
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
 class CueContext extends Context{
  constructor(){super();this.currentTime=0;this.destination={};}
  createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}};}
  createOscillator(){const tone={frequency:{value:0},connect(){},disconnect(){},start(){},stop(){}};tones.push(tone);return tone;}
 }
 class Worklet{constructor(){this.port={};worklets.push(this);}connect(target){this.target=target;}disconnect(){this.disconnected=true;}}
 class Recognition{
  constructor(){this.starts=[];recognizers.push(this);}
  start(track){this.starts.push({track,lang:this.lang});}
  stop(){this.stopped=true;this.onend?.();}
  abort(){this.aborted=true;this.onend?.();}
 }
 class Utterance{constructor(text){this.text=text;}}
 const speechSynthesis={speak(utterance){utterances.push(utterance);},cancel(){}};
 const fetch=async(url,options)=>{
  requests.push({url,body:JSON.parse(options.body)});
  if(url.endsWith('/end')){
   if(holdHangup)return new Promise(resolve=>{hangupResolve=()=>resolve({ok:true});});
   return {ok:true};
  }
  return {ok:true,json:async()=>({callId:'call-'+requests.length,sdp:'answer',wsTicket:'ticket'})};
 };
 const context={useState:state,useRef:ref,useCallback:fn=>fn,useEffect(){},useRentalCatalog:()=>({equipment:[]}),useEventOrder:()=>orderDraft,
  createVoiceDraftTools,voiceConversationContext,voiceGreetingInstructions,voiceGreetingText,createBookingConversationRecorder,readBookingResponse:async()=>replyData||({reply:'Happy to help.',orderPatch:[{path:'event.type',value:'party'}]}),apiBaseUrl:'https://unit.invalid/api',aiFields,aiOrderContext,decodePatchValue,validValue,getPath,performance,bookingFieldSection:()=> 'availability',scrollToAppSection:(section,options)=>{navigation.push({section,...options,eventType:orderDraft?.order?.event?.type});return {shown:navigationShown};},scrollToBookingField:(path,options)=>{navigation.push({path,...options});return {shown:true};},
  fetch,navigator:{mediaDevices:{getUserMedia:async constraints=>{captures.push(constraints);return microphone();}}},SpeechSynthesisUtterance:Utterance,window:{SpeechRecognition:Recognition,speechSynthesis,isSecureContext:true,RTCPeerConnection:Peer,AudioContext:provider==='alibaba'?Context:provider==='openrouter'?CueContext:undefined,AudioWorkletNode:Worklet,location:{href:'https://unit.invalid/'},dispatchEvent(){}},
  RTCPeerConnection:Peer,AudioWorkletNode:Worklet,WebSocket:Socket,Audio:class{pause(){this.paused=true;}},
  AbortController,Blob,URL,crypto,CustomEvent:class{},btoa,atob,console,
  setTimeout(fn,delay){timers.set(++timerId,fn);delays.set(timerId,delay);return timerId;},clearTimeout(id){timers.delete(id);},
 };
 let source=fs.readFileSync(new URL('./AIBookingPanel.jsx',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace('export default function','function');
 source=source.slice(0,source.indexOf('  if(!user||!token)return <OrderSignIn'))+'return {aiTasks,reviewTask,send,startCall,stopCall,pauseCall,toggleMic,chooseVoiceLanguage,voiceLanguage,hearing,browserListening,browserSpeaking,applyStatus,setMode,append,call,micMuted,error};\n}';
 const Component=vm.runInNewContext(source+';AIBookingPanel',context);
 const render=()=>{cursor=0;return Component({ar:false,user:{id:'user'},token:'unit-token',onReview(){}});};
 let controls=render();controls.applyStatus({configured:true,policy:{voice:{provider,enabled:true},chat:{enabled:true}}});controls.setMode('voice');
 const start=async()=>{await render().startCall();if(provider==='alibaba')sockets.at(-1).onmessage({data:JSON.stringify({type:'bridge.ready'})});return render();};
 return {render,start,navigation,captures,recognizers,utterances,tones,async ready(finishOpening=true){const r=recognizers.at(-1);r.onstart();r.onaudiostart();if(finishOpening)utterances[0]?.onend();await new Promise(setImmediate);},async warm(){const entry=[...timers].find(([id])=>delays.get(id)===500);if(entry){timers.delete(entry[0]);entry[1]();}await new Promise(setImmediate);},async finishCue(){tones.at(-1).onended();await new Promise(setImmediate);},async waitPause(){const entry=[...timers].find(([id])=>delays.get(id)===3000);assert.ok(entry,'a thinking pause should be armed');timers.delete(entry[0]);await entry[1]();},tracks,peers,sockets,worklets,requests,timers,holdEnd(){holdHangup=true;},finishEnd(){holdHangup=false;hangupResolve();},pcm(){worklets.at(-1).port.onmessage({data:new Int16Array([1,2,3]).buffer});},channel:()=>provider==='alibaba'?sockets.at(-1):peers.at(-1).channel};
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


test('browser voice waits for capture and the beep, preserves thinking pauses, and stays running between turns',async()=>{
 const h=harness('openrouter');h.render().chooseVoiceLanguage('ar-SA');
 let voice=await h.start();assert.equal(voice.call,'connecting');assert.equal(voice.browserListening,false);
 const mic=h.captures[0].audio;
 assert.equal(mic.echoCancellation.ideal,true);assert.equal(mic.noiseSuppression.ideal,true);assert.equal(mic.autoGainControl.ideal,true);assert.equal(mic.channelCount.ideal,1);
 const recognition=h.recognizers[0];assert.equal(recognition.lang,'ar-SA');assert.equal(recognition.continuous,true);assert.equal(recognition.starts[0].track,h.tracks[0]);
 await h.ready();await h.warm();assert.equal(h.render().call,'active');assert.equal(h.render().browserListening,false,'capture start alone is not the ready cue');assert.equal(h.tracks[0].enabled,true,'microphone must already be live at the start of the beep');
 await h.finishCue();assert.equal(h.render().browserListening,true);assert.equal(h.tracks[0].enabled,true);
 const row=(text,isFinal)=>Object.assign([{transcript:text}],{isFinal});
 const first=row('what events',true),interim=row('do you',false),last=row('do you have',true);
 recognition.onresult({results:[first]});assert.equal(h.requests.filter(row=>row.url.endsWith('/chat')).length,0,'a pause must not immediately send a partial sentence');
 recognition.onspeechstart();assert.equal([...h.timers.values()].length,1,'new speech cancels the thinking timer and retains the call deadline');
 recognition.onresult({results:[first,interim]});assert.equal(h.render().hearing,'what events do you');assert.equal(h.requests.filter(row=>row.url.endsWith('/chat')).length,0);
 recognition.onresult({results:[first,last]});await h.waitPause();
 assert.equal(h.requests.find(row=>row.url.endsWith('/chat')).body.messages.at(-1).content,'what events do you have');
 assert.equal(recognition.stopped,undefined,'recognition must stay alive while Echo replies');assert.equal(h.tracks[0].enabled,true,'camera capture must stay warm between turns');assert.equal(h.render().browserListening,false);assert.equal(h.render().browserSpeaking,true);
 const starts=recognition.starts.length;
 h.utterances.at(-1).onend();await new Promise(setImmediate);assert.equal(h.render().browserListening,false);await h.finishCue();assert.equal(h.render().browserListening,true);assert.equal(recognition.starts.length,starts,'the next turn must not wait for another recognition startup');
 recognition.onresult({results:[first,last]});assert.equal(h.render().hearing,'','old continuous results must not replay');
 recognition.onresult({results:[first,last,row('another event',true)]});
 h.render().toggleMic();assert.equal(h.tracks[0].enabled,false);assert.equal(h.render().browserListening,false);
 h.render().toggleMic();await new Promise(setImmediate);await h.warm();await h.finishCue();assert.equal(h.tracks[0].enabled,true);
 h.render().chooseVoiceLanguage('en-CA');assert.equal(recognition.aborted,true);assert.equal(recognition.starts.at(-1).lang,'en-CA');
 h.render().stopCall();assert.equal(h.tracks[0].stopped,true);
 recognition.onaudiostart();assert.equal(h.render().browserListening,false,'late readiness after hangup must be ignored');
 recognition.onresult({results:[first,last]});assert.equal(h.utterances.length,2);
});

test('stopping while a ready beep is playing cannot re-enable the microphone',async()=>{
 const h=harness('openrouter');await h.start();await h.ready();await h.warm();h.render().stopCall();await h.finishCue();
 assert.equal(h.render().call,'idle');assert.equal(h.render().browserListening,false);assert.equal(h.tracks[0].stopped,true);
});

test('a replaced ready beep cannot report readiness for a newer turn',async()=>{
 const h=harness('openrouter');await h.start();await h.ready();await h.warm();const firstTone=h.tones[0];
 h.render().toggleMic();h.render().toggleMic();await h.warm();
 assert.equal(h.tones.length,2);firstTone.onended();await new Promise(setImmediate);
 assert.equal(h.render().browserListening,false);assert.equal(h.tracks[0].enabled,true,'microphone must already be live at the start of the beep');
 await h.finishCue();assert.equal(h.render().browserListening,true);h.render().stopCall();
});

test('capture settles before the ready beep and retains speech starting during that beep',async()=>{
 const h=harness('openrouter');await h.start();await h.ready();
 assert.equal(h.tones.length,0,'the ready beep must wait for microphone settling');assert.equal(h.tracks[0].enabled,true);
 await h.warm();assert.equal(h.tones.length,1);assert.equal(h.tracks[0].enabled,true,'the beep must never gate microphone input');
 const first=Object.assign([{transcript:'what events do you have'}],{isFinal:true});
 h.recognizers[0].onresult({results:[first]});assert.equal(h.render().hearing,'what events do you have');
 await h.finishCue();await h.waitPause();
 assert.equal(h.requests.find(row=>row.url.endsWith('/chat')).body.messages.at(-1).content,'what events do you have');
 h.render().stopCall();
});

test('PCM capture sends exact 20 ms PCM16 frames without playing the microphone back',()=>{
 const source=fs.readFileSync(new URL('./AIBookingPanel.jsx',import.meta.url),'utf8');
 const code=source.match(/const PCM_WORKLET=`([^`]+)`;/)[1];
 let Processor;const sent=[];
 vm.runInNewContext(code,{AudioWorkletProcessor:class{constructor(){this.port={postMessage:buffer=>sent.push(buffer)};}},registerProcessor(name,processor){Processor=processor;}});
 const processor=new Processor();const output=new Float32Array(128).fill(1);
 for(let frame=0;frame<5;frame++)processor.process([[new Float32Array(128).fill(.5)]],[[output]]);
 assert.equal(sent.length,2);assert.equal(sent[0].byteLength,640);assert.equal(new Int16Array(sent[0])[0],16383);assert.ok(output.every(value=>value===0));
 assert.equal(processor.process([],[[output]]),true);
});


test('text questions can be sent while the booking draft is unavailable without editing that draft',async()=>{
 const draft={cloudReady:false,signedIn:true,saveState:'load-failed',order:{event:{}},begin(){assert.fail('an unavailable draft must not be started');},patchAi(){assert.fail('an unavailable draft must not be edited');}};
 const h=harness('openrouter',{orderDraft:draft});
 const reply=await h.render().send('What events do you have?');
 assert.equal(reply,'Happy to help.');
 const body=h.requests.find(row=>row.url.endsWith('/chat')).body;
 assert.equal(body.messages.at(-1).content,'What events do you have?');assert.equal(body.order,undefined);
 assert.equal(h.render().error,'');
});


test('voice call introduces Echo before user speech and beeps only after the introduction',async()=>{
 const h=harness('openrouter');h.render().chooseVoiceLanguage('ar-SA');await h.start();
 assert.equal(h.utterances.length,1);assert.match(h.utterances[0].text,/مرحباً/);assert.equal(h.utterances[0].lang,'ar-SA');
 assert.equal(h.render().browserSpeaking,true);assert.equal(h.render().browserListening,false);
 await h.ready(false);await h.warm();assert.equal(h.tones.length,0,'opening speech must finish before the ready beep');
 const ignored=Object.assign([{transcript:h.utterances[0].text}],{isFinal:true});h.recognizers[0].onresult({results:[ignored]});
 assert.equal(h.requests.filter(row=>row.url.endsWith('/chat')).length,0,'the introduction must not be recognized as client input');
 h.utterances[0].onend();await h.warm();assert.equal(h.tones.length,1);await h.finishCue();assert.equal(h.render().browserListening,true);
 const question=Object.assign([{transcript:'ما الخدمات التي تقدمونها؟'}],{isFinal:true});h.recognizers[0].onresult({results:[ignored,question]});await h.waitPause();
 const messages=h.requests.find(row=>row.url.endsWith('/chat')).body.messages;
 assert.equal(messages[0].role,'assistant');assert.equal(messages[0].content,h.utterances[0].text,'follow-up requests must include the introduction as earlier assistant speech');
 assert.equal(messages.at(-1).content,'ما الخدمات التي تقدمونها؟');assert.equal(h.utterances.length,2);h.render().stopCall();
});


test('text applies confirmed draft changes before explicit calendar or venue navigation',async()=>{
 const draft={cloudReady:true,signedIn:true,order:{event:{}},begin(){},patchAi(patch){for(const change of patch)this.order.event.type=change.value;return {};}};
 const replyData={reply:'Let’s look at the venue.',section:'availability',face:'venue',orderPatch:[{path:'event.type',value:'party'}]};
 const h=harness('openrouter',{orderDraft:draft,replyData});await h.render().send('Make it a party and show the venue.');
 assert.equal(draft.order.event.type,'party');assert.equal(h.navigation.length,1);
 assert.equal(h.navigation[0].section,'availability');assert.equal(h.navigation[0].face,'venue');assert.equal(h.navigation[0].eventType,'party');
 assert.equal(h.navigation[0].path,undefined,'field-following must not override explicit navigation');
});

test('text navigates without changing a draft and follows fields when there is no explicit destination',async()=>{
 const navigationOnly=harness('openrouter',{replyData:{reply:'Here is the setup simulation.',section:'simulation',orderPatch:[]}});
 await navigationOnly.render().send('Show the room simulation.');assert.equal(navigationOnly.navigation[0].section,'simulation');
 const draft={cloudReady:true,signedIn:true,order:{event:{}},begin(){},patchAi(){this.order.event.type='party';return {};}};
 const h=harness('openrouter',{orderDraft:draft,replyData:{reply:'I updated your event.',section:'none',orderPatch:[{path:'event.type',value:'party'}]}});
 await h.render().send('It is a party.');assert.equal(h.navigation[0].path,'event.type');
});


test('confirmed AI tasks have separate True/False reviews and feedback reaches the next turn',async()=>{
 const draft={cloudReady:true,signedIn:true,order:{event:{}},begin(){},patchAi(){this.order.event.type='party';return {};}};
 const h=harness('openrouter',{orderDraft:draft,replyData:{reply:'Updated and shown.',section:'availability',face:'venue',orderPatch:[{path:'event.type',value:'party'}]}});
 await h.render().send('Make it a party and show the venue.');
 let tasks=h.render().aiTasks;assert.equal(tasks.length,2);assert.equal(tasks[0].confirmed,null);assert.match(tasks[0].label,/party/);assert.match(tasks[1].label,/Venue/);
 h.render().reviewTask(tasks[0].id,false);tasks=h.render().aiTasks;
 assert.equal(tasks[0].confirmed,false);assert.equal(tasks[1].confirmed,null);assert.equal(draft.order.event.type,'party','review is feedback, not an implicit undo');
 const saves=h.requests.length;h.render().reviewTask(tasks[0].id,false);assert.equal(h.requests.length,saves,'the same review must not be duplicated');
 h.render().reviewTask(tasks[1].id,true);assert.equal(h.render().aiTasks[1].confirmed,true);
 assert.equal(h.requests.filter(row=>row.url.endsWith('/chat')).length,1,'reviewing must not start another AI request');
 await h.render().send('Please check my feedback.');
 const messages=h.requests.filter(row=>row.url.endsWith('/chat')).at(-1).body.messages;
 assert.ok(messages.some(row=>row.role==='user'&&row.content.includes('"confirmed":false')));assert.ok(messages.some(row=>row.content.includes('"confirmed":true')));
});

test('unconfirmed draft changes and unsuccessful navigation never appear as completed tasks',async()=>{
 const h=harness('openrouter',{orderDraft:{signedIn:true,cloudReady:false,order:{event:{}},saveState:'load-failed'},navigationShown:false,replyData:{reply:'The view is unavailable.',section:'simulation',orderPatch:[{path:'event.type',value:'party'}]}});
 await h.render().send('Change the event and show simulation.');assert.equal(h.render().aiTasks.length,0);
});
