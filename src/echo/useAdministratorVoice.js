import {useCallback,useEffect,useRef,useState} from 'react';

// Voice turns use the same authenticated tasks and approval flow as typed messages.
export default function useAdministratorVoice({token,messages,onCommand,onTranscript,blocked}){
 const [active,setActive]=useState(false),[phase,setPhase]=useState('idle'),[error,setError]=useState(''),[waiting,setWaiting]=useState(null);
 const runtime=useRef({active:false,epoch:0,recognition:null,timer:null,utterance:null,handled:null});
 const callbacks=useRef({onCommand,onTranscript,blocked});callbacks.current={onCommand,onTranscript,blocked};
 const supported=typeof window!=='undefined'&&Boolean(window.SpeechRecognition||window.webkitSpeechRecognition)&&'speechSynthesis' in window&&'SpeechSynthesisUtterance' in window;
 const stop=useCallback(()=>{
  const state=runtime.current;state.active=false;state.epoch++;clearTimeout(state.timer);
  const recognition=state.recognition;state.recognition=null;if(recognition){recognition.onend=recognition.onerror=recognition.onresult=null;try{recognition.abort();}catch{}}
  if(state.utterance){state.utterance.onend=state.utterance.onerror=null;window.speechSynthesis.cancel();state.utterance=null;}
  state.handled=null;setActive(false);setPhase('idle');setWaiting(null);
 },[]);
 const listen=useCallback(function nextTurn(){
  const state=runtime.current;if(!state.active)return;
  if(callbacks.current.blocked){stop();return;}
  const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
  const epoch=++state.epoch;let text='',finalText='';let recognition;
  try{recognition=new Recognition();}catch{stop();setError('Voice recognition is unavailable. You can still type.');return;}
  const current=()=>state.active&&state.epoch===epoch;
  state.recognition=recognition;recognition.lang=navigator.language||'en-CA';recognition.continuous=false;recognition.interimResults=true;
  recognition.onresult=event=>{if(!current())return;text=Array.from(event.results,result=>result[0]?.transcript||'').join(' ').trim().slice(0,8000);finalText=Array.from(event.results).filter(result=>result.isFinal).map(result=>result[0]?.transcript||'').join(' ').trim().slice(0,8000);callbacks.current.onTranscript(text);};
  recognition.onerror=event=>{if(!current())return;stop();setError(({ 'not-allowed':'Microphone access was denied. Enable it in your browser to use voice.', 'audio-capture':'No microphone is available.', 'no-speech':'No speech detected. Start voice again when you are ready.', network:'Speech recognition could not connect. You can still type.' })[event.error]||'Voice recognition stopped. Start voice again or type your request.');};
  recognition.onend=async()=>{
   if(!current())return;clearTimeout(state.timer);state.recognition=null;recognition.onend=recognition.onerror=recognition.onresult=null;text=finalText;
   if(!text){stop();return;}
   if(callbacks.current.blocked){stop();return;}
   setPhase('working');
   try{const task=await callbacks.current.onCommand(text);if(!current())return;if(!task){stop();return;}setWaiting(task._id);}catch(e){if(current()){stop();setError(e.message||'Unable to send your voice request.');}}
  };
  setPhase('listening');
  try{recognition.start();state.timer=setTimeout(()=>{if(current()){try{recognition.stop();if(current()&&state.recognition===recognition)state.timer=setTimeout(()=>{if(current())stop();},2000);}catch{stop();}}},60000);}catch{stop();setError('Could not start the microphone. Try again or type your request.');}
 },[stop]);
 const speak=useCallback((text,continueListening)=>{
  const state=runtime.current;if(!state.active)return;const epoch=++state.epoch;clearTimeout(state.timer);
  if(state.utterance){state.utterance.onend=state.utterance.onerror=null;window.speechSynthesis.cancel();state.utterance=null;}
  const words=new DOMParser().parseFromString(String(text),'text/html').body.textContent?.trim().slice(0,5000);
  if(!words){if(continueListening)listen();return;}
  const utterance=new SpeechSynthesisUtterance(words);utterance.lang=navigator.language||'en-CA';state.utterance=utterance;setPhase('speaking');
  const finished=()=>{if(!state.active||state.epoch!==epoch)return;clearTimeout(state.timer);state.utterance=null;if(continueListening){state.timer=setTimeout(listen,500);}else setPhase('approval');};
  utterance.onend=finished;utterance.onerror=()=>{if(!state.active||state.epoch!==epoch)return;stop();setError('Voice playback was interrupted. Your reply is available in the chat.');};
  state.timer=setTimeout(()=>{if(state.active&&state.epoch===epoch){stop();setError('Voice playback timed out. Your reply is available in the chat.');}},90000);
  try{window.speechSynthesis.speak(utterance);}catch{stop();setError('Your browser could not play the reply. Read it in the chat.');}
 },[listen,stop]);
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
 },[token,stop]);
 const start=()=>{if(!supported||callbacks.current.blocked)return;setError('');runtime.current.active=true;setActive(true);listen();};
 return {active,phase,error,supported,start,stop};
}
