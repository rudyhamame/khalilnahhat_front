import {useCallback,useEffect,useRef,useState} from 'react';
import {captureAdministratorSpeech,administratorAudioSupported,playAdministratorSpeech} from '../lib/administratorAudio';

// Voice turns use the same authenticated tasks and approval flow as typed messages.
export default function useAdministratorVoice({token,messages,onCommand,onTranscript,blocked,services}){
 const [active,setActive]=useState(false),[phase,setPhase]=useState('idle'),[error,setError]=useState(''),[waiting,setWaiting]=useState(null);
 const runtime=useRef({active:false,epoch:0,recognition:null,timer:null,utterance:null,handled:null,audioController:null});
 const callbacks=useRef({onCommand,onTranscript,blocked,services});callbacks.current={onCommand,onTranscript,blocked,services};
 const supported=typeof window!=='undefined'&&services?.voice?.enabled&&administratorAudioSupported(services.stt)&&(services.voice.provider==='openai'||('speechSynthesis' in window&&'SpeechSynthesisUtterance' in window));
 const stop=useCallback(()=>{
  const state=runtime.current;state.active=false;state.epoch++;clearTimeout(state.timer);
  const recognition=state.recognition;state.recognition=null;if(recognition){recognition.cancel();}
  if(state.utterance){state.utterance.onend=state.utterance.onerror=null;window.speechSynthesis.cancel();state.utterance=null;}
  state.audioController?.abort();state.audioController=null;state.handled=null;setActive(false);setPhase('idle');setWaiting(null);
 },[]);
 const listen=useCallback(function nextTurn(){
  const state=runtime.current;if(!state.active)return;
  if(callbacks.current.blocked){stop();return;}
  const epoch=++state.epoch;
  const current=()=>state.active&&state.epoch===epoch;
  state.recognition=captureAdministratorSpeech({config:callbacks.current.services.stt,token,
   onText:text=>{if(current())callbacks.current.onTranscript(text);},
   onError:error=>{if(current()){stop();setError(error.message);}},
   onEnd:async text=>{
    if(!current())return;state.recognition=null;
    if(!text||callbacks.current.blocked){stop();return;}
    setPhase('working');
    try{const task=await callbacks.current.onCommand(text);if(!current())return;if(!task){stop();return;}setWaiting(task._id);}catch(e){if(current()){stop();setError(e.message||'Unable to send your voice request.');}}
   }
  });
  setPhase('listening');state.recognition.start();
 },[stop,token]);
 const speak=useCallback((text,continueListening)=>{
  const state=runtime.current;if(!state.active)return;const epoch=++state.epoch;clearTimeout(state.timer);
  if(state.utterance){state.utterance.onend=state.utterance.onerror=null;window.speechSynthesis.cancel();state.utterance=null;}
  const words=new DOMParser().parseFromString(String(text),'text/html').body.textContent?.trim().slice(0,5000);
  if(!words){if(continueListening)listen();return;}
  if(callbacks.current.services.voice.provider==='openai'){
   const controller=new AbortController();state.audioController?.abort();state.audioController=controller;setPhase('speaking');
   const done=error=>{if(!state.active||state.epoch!==epoch)return;clearTimeout(state.timer);if(error){stop();setError(error.message);return;}if(continueListening)state.timer=setTimeout(listen,500);else setPhase('approval');};
   state.timer=setTimeout(()=>{if(state.active&&state.epoch===epoch){stop();setError('Voice playback timed out. Your reply is available in chat.');}},90000);
   playAdministratorSpeech({config:callbacks.current.services.voice,token,text:words,signal:controller.signal,onEnd:done}).catch(error=>{if(!controller.signal.aborted)done(error);});return;
  }
  const utterance=new SpeechSynthesisUtterance(words);utterance.lang=navigator.language||'en-CA';state.utterance=utterance;setPhase('speaking');
  const finished=()=>{if(!state.active||state.epoch!==epoch)return;clearTimeout(state.timer);state.utterance=null;if(continueListening){state.timer=setTimeout(listen,500);}else setPhase('approval');};
  utterance.onend=finished;utterance.onerror=()=>{if(!state.active||state.epoch!==epoch)return;stop();setError('Voice playback was interrupted. Your reply is available in the chat.');};
  state.timer=setTimeout(()=>{if(state.active&&state.epoch===epoch){stop();setError('Voice playback timed out. Your reply is available in the chat.');}},90000);
  try{window.speechSynthesis.speak(utterance);}catch{stop();setError('Your browser could not play the reply. Read it in the chat.');}
 },[listen,stop,token]);
 useEffect(()=>{
  if(!active||!waiting)return;const state=runtime.current,task=messages.find(row=>row._id===waiting);if(!task)return;
  if(task.state==='AWAITING_APPROVAL'){
   const key=task._id+':'+task.pending?.digest;if(state.handled===key)return;state.handled=key;speak('Please review the proposed change in the chat and choose Approve or Reject.',false);return;
  }
  if(!['COMPLETED','FAILED','CANCELLED'].includes(task.state))return;
  setWaiting(null);state.handled=null;
  speak(task.result?.message||task.error||(task.state==='CANCELLED'?'The request was cancelled.':'The request finished without a reply.'),true);
 },[active,waiting,messages,speak]);
 useEffect(()=>{if(blocked&&runtime.current.active)stop();},[blocked,stop]);
 useEffect(()=>{
  const hide=()=>{if(document.hidden)stop();};document.addEventListener('visibilitychange',hide);window.addEventListener('pagehide',stop);
  return()=>{stop();document.removeEventListener('visibilitychange',hide);window.removeEventListener('pagehide',stop);};
 },[token,services?.revision,stop]);
 useEffect(()=>{if(!active)return;const timer=setTimeout(()=>{stop();},(services?.voice?.maxCallSeconds||300)*1000);return()=>clearTimeout(timer);},[active,services?.voice?.maxCallSeconds,stop]);
 const start=()=>{if(!supported||callbacks.current.blocked)return;setError('');runtime.current.active=true;setActive(true);listen();};
 return {active,phase,error,supported,start,stop};
}
