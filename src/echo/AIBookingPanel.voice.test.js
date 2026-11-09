import {createAiTaskWriter} from '../lib/bookingDraftEdits.js';
import {numberedRentalCatalog} from '../lib/numberedRentalCatalog.js';
import {fieldSubject,sameBookingSubject,subjectName,bookingTransitionIntent} from '../lib/bookingSubject.js';
import {bookingGoal,goalNextStep} from '../lib/bookingGoals.js';
import {bookingNextStep} from '../lib/bookingNextStep.js';
import {aiMessageViewport} from '../lib/aiMessageViewport.js';
import {explicitEquipmentQuantities} from '../lib/equipmentQuantityIntent.js';
import {handleAvatarVoiceEvent} from '../lib/voiceAvatarMotion.js';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {aiTaskHistoryKey,readAiTaskHistory,saveAiTaskHistory} from '../lib/aiTaskHistory.js';
import {formatAiDraftTask,resolveAiTaskChange,resolveAiTaskChanges,presentAiTask,formatAiTaskNote,aiTaskNoteText} from '../lib/aiTaskPresentation.js';
import {explicitEventChoice} from '../lib/explicitEventChoice.js';
import {createVoiceDraftTools} from '../lib/voiceDraftTools.js';
import {claimsDraftChange,voiceConversationContext} from '../lib/aiBookingStream.mjs';
import {createBookingConversationRecorder} from '../lib/bookingConversationRecorder.js';
import {voiceGreetingInstructions,voiceGreetingText,createEventOrder,aiFields,aiOrderContext,decodePatchValue,validValue,getPath,applyOrderPatch,missingOrderFields,hasEventDraftContent} from '../lib/eventOrderCore.mjs';

// Run the component's real call handlers with in-memory media and provider
// adapters. No microphone, account, paid session, or network is opened.
function harness(provider,{orderDraft={cloudReady:true,signedIn:true,order:createEventOrder()},replyData=null,navigationShown=true,bookingSubject=null}={}){
 if(orderDraft&&!orderDraft.commitAi)orderDraft.commitAi=async changes=>{
  const result=orderDraft.patchAi?.(changes)||{};
  const updatedFields=changes.filter(change=>JSON.stringify(getPath(orderDraft.order,change.path))===JSON.stringify(change.value));
  return {...result,updatedFields,rejectedFields:result.rejectedFields||[],draftUpdated:updatedFields.length>0,saved:await (orderDraft.save?.()??true)};
 };
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
  return {ok:true,json:async()=>({callId:'call-'+requests.length,sdp:'answer',wsTicket:'ticket',manualTurns:provider==='openai'})};
 };
 const context={useState:state,useRef:ref,useCallback:fn=>fn,useMemo:fn=>fn(),useEffect(){},useAiTaskNotification:()=>()=>{},useRentalCatalog:()=>({equipment:[],catalog:[]}),useEventOrder:()=>orderDraft,
  claimsDraftChange,createAiTaskWriter,numberedRentalCatalog,fieldSubject,sameBookingSubject,subjectName,bookingTransitionIntent,bookingNextStep,bookingGoal,goalNextStep,aiMessageViewport,explicitEquipmentQuantities,handleAvatarVoiceEvent,applyOrderPatch,missingOrderFields,hasEventDraftContent,currentBookingSubject:()=>bookingSubject,APP_VIEWPORT_TARGETS:{availability:"#availability",setup:"#services",work:"#work",simulation:"#services"},
  resolveAiTaskChange,resolveAiTaskChanges,presentAiTask,formatAiTaskNote,aiTaskNoteText,formatAiDraftTask,aiTaskHistoryKey,readAiTaskHistory,saveAiTaskHistory,explicitEventChoice,createVoiceDraftTools,voiceConversationContext,voiceGreetingInstructions,voiceGreetingText,createBookingConversationRecorder,readBookingResponse:async()=>replyData||({reply:'Happy to help.',orderPatch:[{path:'event.type',value:'party'}]}),apiBaseUrl:'https://unit.invalid/api',aiFields,aiOrderContext,decodePatchValue,validValue,getPath,performance,bookingFieldSection:()=> 'availability',scrollToAppSection:(section,options)=>{navigation.push({section,...options,eventType:orderDraft?.order?.event?.type});return {shown:navigationShown};},scrollToBookingField:(path,options)=>{navigation.push({path,...options});return {shown:true};},
  fetch,navigator:{mediaDevices:{getUserMedia:async constraints=>{captures.push(constraints);return microphone();}}},SpeechSynthesisUtterance:Utterance,window:{SpeechSynthesisUtterance:Utterance,SpeechRecognition:Recognition,speechSynthesis,isSecureContext:true,RTCPeerConnection:Peer,AudioContext:provider==='alibaba'?Context:provider==='openrouter'?CueContext:undefined,AudioWorkletNode:Worklet,location:{href:'https://unit.invalid/'},dispatchEvent(){}},
  RTCPeerConnection:Peer,AudioWorkletNode:Worklet,WebSocket:Socket,Audio:class{pause(){this.paused=true;}},
  Event,document:{querySelector(){return null;},getElementById(){return null;}},requestAnimationFrame:fn=>fn(),AbortController,Blob,URL,crypto,CustomEvent:class{},btoa,atob,console,
  setTimeout(fn,delay){timers.set(++timerId,fn);delays.set(timerId,delay);return timerId;},clearTimeout(id){timers.delete(id);},
 };
 context.speakBrowserText=vm.runInNewContext(fs.readFileSync(new URL('../lib/browserSpeech.js',import.meta.url),'utf8').replace('export async function','async function')+';speakBrowserText',context);
 let source=fs.readFileSync(new URL('./AIBookingPanel.jsx',import.meta.url),'utf8').replace(/^import .*;\n/gm,'').replace(/function TaskNote[\s\S]*?\nexport default function/,'export default function').replace('export default function','function');
 source=source.slice(0,source.indexOf('  if(!user||!token)return <OrderSignIn'))+'return {aiTasks,setAiTasks,confirmingTask,reviewTask,send,startCall,stopCall,pauseCall,toggleMic,chooseVoiceLanguage,voiceLanguage,hearing,browserListening,modifyTask,modifyingTask,applyVoiceUpdates,interruptCall,browserSpeaking,applyStatus,setMode,append,call,micMuted,error};\n}';
 const Component=vm.runInNewContext(source+';AIBookingPanel',context);
 const render=()=>{cursor=0;return Component({ar:false,user:{id:'user',firstName:'Rudy',lastName:'Hamame'},token:'unit-token',onReview(){}});};
 let controls=render();controls.applyStatus({configured:true,policy:{voice:{provider,enabled:true},chat:{enabled:true}}});controls.setMode('voice');
 const start=async()=>{const starting=render().startCall();if(provider==='openrouter')await new Promise(setImmediate);else await starting;if(provider==='alibaba')sockets.at(-1).onmessage({data:JSON.stringify({type:'bridge.ready'})});return render();};
 return {render,start,navigation,captures,recognizers,utterances,tones,async ready(finishOpening=true){const r=recognizers.at(-1);r.onstart();r.onaudiostart();if(finishOpening)utterances[0]?.onend();await new Promise(setImmediate);},async warm(){const entry=[...timers].find(([id])=>delays.get(id)===500);if(entry){timers.delete(entry[0]);entry[1]();}await new Promise(setImmediate);},async finishCue(){tones.at(-1).onended();await new Promise(setImmediate);},async waitPause(){const entry=[...timers].find(([id])=>delays.get(id)===3000);assert.ok(entry,'a thinking pause should be armed');timers.delete(entry[0]);void entry[1]();await new Promise(setImmediate);},tracks,peers,sockets,worklets,requests,timers,
 async event(event){await this.channel().onmessage({data:JSON.stringify(event)});},
 async nativeReady(){const entry=[...timers].find(([id])=>delays.get(id)===450);if(entry){timers.delete(entry[0]);await entry[1]();}},
 holdEnd(){holdHangup=true;},finishEnd(){holdHangup=false;hangupResolve();},pcm(){worklets.at(-1).port.onmessage({data:new Int16Array([1,2,3]).buffer});},channel:()=>provider==='alibaba'?sockets.at(-1):peers.at(-1).channel};
}
for(const provider of ['openai','alibaba']){
 test(`${provider}: mute keeps the call open; pause releases it; resume waits for hangup and keeps context`,async()=>{
  const h=harness(provider);let voice=await h.start();assert.equal(voice.call,'active');
  if(provider==='alibaba'){h.pcm();assert.equal(h.channel().sent.filter(e=>e.type==='input_audio_buffer.append').length,1);}
  voice.toggleMic();voice=h.render();assert.equal(voice.micMuted,true);assert.equal(h.tracks[0].enabled,false);assert.equal(h.tracks[0].stopped,false);
  if(provider==='alibaba'){h.pcm();assert.equal(h.channel().sent.filter(e=>e.type==='input_audio_buffer.append').length,1);}
  voice.toggleMic();if(provider==='openai'){assert.equal(h.tracks[0].enabled,false,'unmuting cannot bypass speaker protection');await h.event({type:'response.done',response:{status:'completed',output:[]}});await h.nativeReady();}assert.equal(h.tracks[0].enabled,true);
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
 const h=harness('openrouter',{orderDraft:draft,replyData:{reply:'Happy to help.',orderPatch:[]}});
 const reply=await h.render().send('What events do you have?');
 assert.equal(reply,'Happy to help.',h.render().error);
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
 h.utterances[0].onend();await new Promise(setImmediate);await h.warm();assert.equal(h.tones.length,1);await h.finishCue();assert.equal(h.render().browserListening,true);
 const question=Object.assign([{transcript:'ما الخدمات التي تقدمونها؟'}],{isFinal:true});h.recognizers[0].onresult({results:[ignored,question]});await h.waitPause();
 const messages=h.requests.find(row=>row.url.endsWith('/chat')).body.messages;
 assert.equal(messages[0].role,'assistant');assert.equal(messages[0].content,h.utterances[0].text,'follow-up requests must include the introduction as earlier assistant speech');
 assert.equal(messages.at(-1).content,'ما الخدمات التي تقدمونها؟');assert.equal(h.utterances.length,2);h.render().stopCall();
});


test('text applies confirmed draft changes before explicit calendar or venue navigation',async()=>{
 const draft={cloudReady:true,signedIn:true,order:{event:{}},begin(){},patchAi(patch){for(const change of patch)this.order.event.type=change.value;return {};}};
 const replyData={reply:'Let’s look at the venue.',section:'availability',face:'venue',orderPatch:[{path:'event.type',value:'party'}]};
 const h=harness('openrouter',{orderDraft:draft,replyData});await h.render().send('Make it a party and show the venue.');
 assert.equal(draft.order.event.type,'party');assert.equal(h.render().aiTasks[0].confirmed,true);assert.equal(h.navigation.at(-1).path,'event.date','the next unanswered event question stays in the current subject');
});

test('text navigates without changing a draft and follows fields when there is no explicit destination',async()=>{
 const navigationOnly=harness('openrouter',{replyData:{reply:'Here is the setup simulation.',section:'simulation',orderPatch:[]}});
 await navigationOnly.render().send('Show the room simulation.');assert.equal(navigationOnly.render().error,'');assert.equal(navigationOnly.navigation[0].section,'simulation');assert.equal(navigationOnly.render().aiTasks.length,0,'showing a viewport is not a draft-edit task');
 const draft={cloudReady:true,signedIn:true,order:{event:{}},begin(){},patchAi(){this.order.event.type='party';return {};}};
 const h=harness('openrouter',{orderDraft:draft,replyData:{reply:'I updated your event.',section:'none',orderPatch:[{path:'event.type',value:'party'}]}});
 await h.render().send('It is a party.');assert.equal(h.navigation[0].path,'event.date');
});


test('automatic tasks save immediately and Modify waits for a replacement answer',async()=>{
 const draft={cloudReady:true,signedIn:true,order:{event:{}},save:async()=>true,patchAi(patch){for(const change of patch)this.order.event[change.path.split('.')[1]]=change.value;return {};}};
 const h=harness('openrouter',{orderDraft:draft,replyData:{reply:'Updated.',orderPatch:[{path:'event.type',value:'party'},{path:'event.guestCount',value:'150'}]}});
 await h.render().send('A party for 150 guests.');
 const tasks=h.render().aiTasks;assert.equal(tasks.length,2);assert.ok(tasks.every(task=>task.confirmed===true));
 assert.equal(draft.order.event.type,'party');assert.equal(draft.order.event.guestCount,150);
 h.render().modifyTask(tasks[0].id);assert.equal(h.render().modifyingTask.id,tasks[0].id);
 assert.equal(h.requests.filter(row=>row.url.endsWith('/chat')).length,1,'Modify asks locally and waits for the client');
 await h.render().send('Wedding');assert.equal(draft.order.event.type,'wedding');assert.equal(h.render().modifyingTask,null);assert.equal(h.render().aiTasks.at(-1).confirmed,true);
});

test('unconfirmed draft changes and unsuccessful navigation never appear as completed tasks',async()=>{
 const h=harness('openrouter',{orderDraft:{signedIn:true,cloudReady:false,order:{event:{}},saveState:'load-failed'},navigationShown:false,replyData:{reply:'The view is unavailable.',section:'simulation',orderPatch:[{path:'event.type',value:'party'}]}});
 await h.render().send('Change the event and show simulation.');assert.equal(h.render().aiTasks.length,0);
});


test('a direct Wedding answer selects the real draft even when the model returns no patch',async()=>{
 const draft={cloudReady:true,signedIn:true,order:{event:{}},begin(){},patchAi(patch){for(const change of patch)this.order.event.type=change.value;return {};}};
 const h=harness('openrouter',{orderDraft:draft,replyData:{reply:'Great, I set it.',section:'availability',orderPatch:[]}});
 const reply=await h.render().send('Wedding');assert.equal(draft.order.event.type,'wedding');assert.match(reply,/draft is updated/);
 assert.equal(h.render().aiTasks[0].confirmed,true);
 assert.ok(h.render().aiTasks.some(task=>task.label.includes('Wedding')));
});

test('an explicit client event choice overrides a contradictory model event patch',async()=>{
 const draft={cloudReady:true,signedIn:true,order:{event:{}},begin(){},patchAi(patch){for(const change of patch)this.order.event.type=change.value;return {};}};
 const h=harness('openrouter',{orderDraft:draft,replyData:{reply:'I set it to party.',orderPatch:[{path:'event.type',value:'party'}]}});
 const reply=await h.render().send('Select wedding');assert.equal(draft.order.event.type,'wedding');assert.doesNotMatch(reply,/party/);
 assert.equal(h.navigation[0].path,'event.date');
});

test('Wedding cannot be acknowledged when the draft is unavailable',async()=>{
 const h=harness('openrouter',{orderDraft:{signedIn:true,cloudReady:false,order:{event:{}},saveState:'load-failed'},replyData:{reply:'I set it to wedding.',orderPatch:[]}});
 assert.match(await h.render().send('Wedding'),/could not apply/);
 assert.equal(h.requests.filter(row=>row.url.endsWith('/chat')).length,1);assert.equal(h.render().aiTasks.length,0);
});

test('direct event parsing rejects questions, negations and multiple choices',()=>{
 const allowed=['wedding','engagement','party'];
 assert.equal(explicitEventChoice('Wedding',[],allowed),'wedding');assert.equal(explicitEventChoice('change it to engagement.',[],allowed),'engagement');
 for(const input of ['not wedding','what is a wedding?','wedding or party','wedding?','not a party','I went to a wedding'])assert.equal(explicitEventChoice(input,[],allowed),null);
 assert.equal(explicitEventChoice('زفاف',[{kind:'event',isActive:true,bookingType:'wedding',nameAr:'زفاف'}],allowed),'wedding');
});


test('True on an older Wedding task applies it and waits for account save before confirming',async()=>{
 let saveDone;const draft={cloudReady:true,signedIn:true,order:{event:{type:'party'}},patchAi(patch){this.order.event.type=patch[0].value;return {};},save:()=>new Promise(resolve=>{saveDone=resolve;})};
 const h=harness('openrouter',{orderDraft:draft});h.render().setAiTasks([{id:'old',label:'What kind of event is it?: wedding',confirmed:null}]);
 const confirmation=h.render().reviewTask('old',true);await new Promise(setImmediate);
 assert.equal(draft.order.event.type,'wedding');assert.equal(h.render().aiTasks[0].confirmed,null);assert.equal(h.render().confirmingTask,'old');
 assert.equal(h.requests.length,0,'no confirmation note is saved before the draft save succeeds');
 saveDone(true);await confirmation;
 assert.equal(h.render().aiTasks.length,1,'confirmation must not duplicate the task');assert.equal(h.render().aiTasks[0].confirmed,true);
 const note=h.requests.find(row=>row.url.endsWith('/conversations')).body.messages[0].content;
 assert.equal(note,'[TASK] Event: Wedding confirmed by Rudy Hamame');assert.equal(h.render().confirmingTask,null);
});

test('failed saving does not tick True or write a success note',async()=>{
 const draft={cloudReady:true,signedIn:true,order:{event:{}},patchAi(patch){this.order.event.type=patch[0].value;return {};},save:async()=>false};
 const h=harness('openrouter',{orderDraft:draft});h.render().setAiTasks([{id:'old',label:'What kind of event is it?: wedding',confirmed:null}]);
 await h.render().reviewTask('old',true);assert.equal(h.render().aiTasks[0].confirmed,null);assert.match(h.render().error,/could not be saved/);assert.equal(h.requests.length,0);
});

test('OpenAI replies once per transcript and keeps capture blocked until output playback stops',async()=>{
 const h=harness('openai');await h.start();
 assert.equal(h.tracks[0].enabled,false);
 await h.event({type:'response.created'});
 await h.event({type:'output_audio_buffer.started'});
 await h.event({type:'response.done',response:{status:'completed',output:[{type:'message',content:[{type:'audio'}]}]}});
 await h.nativeReady();assert.equal(h.tracks[0].enabled,false,'generation completion cannot reopen speaker feedback');
 await h.event({type:'output_audio_buffer.stopped'});await h.nativeReady();assert.equal(h.tracks[0].enabled,true);
 const before=h.channel().sent.filter(event=>event.type==='response.create').length;
 const event={type:'conversation.item.input_audio_transcription.completed',event_id:'speech-venue',item_id:'utterance-1',transcript:"Yes, let's go to the venue."};
 await h.event(event);await h.event(event);
 assert.equal(h.channel().sent.filter(event=>event.type==='response.create').length,before+1);
 assert.equal(h.tracks[0].enabled,false,'capture closes before requesting the reply');
 h.render().stopCall();
});
test('OpenAI tool completion automatically saves the task and requests a spoken continuation',async()=>{
 const draft={cloudReady:true,signedIn:true,order:createEventOrder(),patchAi(patch){this.order=applyOrderPatch(this.order,patch);return {};},save:async()=>true};
 const h=harness('openai',{orderDraft:draft});await h.start();await h.event({type:'response.created'});
 const item={type:'function_call',status:'completed',call_id:'event-tool',name:'update_event_draft',arguments:JSON.stringify({updates:[{path:'event.type',value:'wedding'}]})};
 await h.event({type:'response.output_item.done',item});
 assert.equal(draft.order.event.type,'wedding');assert.equal(h.render().aiTasks[0].confirmed,true);
 const before=h.channel().sent.filter(event=>event.type==='response.create').length;
 await h.event({type:'response.done',response:{status:'completed',output:[item]}});
 assert.equal(h.channel().sent.filter(event=>event.type==='response.create').length,before+1);
 const output=h.channel().sent.find(event=>event.item?.type==='function_call_output');
 assert.equal(JSON.parse(output.item.output).saved,true);h.render().stopCall();
});
test('explicit interruption cancels Echo output and reopens input after cleared playback',async()=>{
 const h=harness('openai');await h.start();await h.event({type:'response.created'});await h.event({type:'output_audio_buffer.started'});
 h.render().interruptCall();assert.equal(h.tracks[0].enabled,false);
 assert.ok(h.channel().sent.some(event=>event.type==='response.cancel'));assert.ok(h.channel().sent.some(event=>event.type==='output_audio_buffer.clear'));
 await h.event({type:'response.done',response:{status:'cancelled',output:[]}});
 await h.event({type:'output_audio_buffer.cleared'});await h.nativeReady();assert.equal(h.tracks[0].enabled,true);h.render().stopCall();
});


test('a direct client request to change chapters does not ask permission again',async()=>{
 const h=harness('openrouter',{bookingSubject:{section:'availability',face:'venue'},replyData:{reply:'Would you like to add DJ Khalil service?',orderPatch:[],section:'work'}});
 const reply=await h.render().send('Yes, go to DJ service.');
 assert.equal(reply,'Would you like to add DJ Khalil service?');assert.doesNotMatch(reply,/keep working/);
 assert.ok(h.navigation.some(row=>row.section==='work'));
});
