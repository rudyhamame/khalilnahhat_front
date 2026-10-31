import React,{useCallback,useEffect,useRef,useState} from 'react';
import {AdministratorVoiceContext} from './administratorVoiceContext';
import useAdministratorVoiceRuntime from './useAdministratorVoiceRuntime';
import {notifyAdministratorChanges} from './administratorChanges';

// One connection per browser tab. Dashboard pages subscribe to it; changing a
// page must not tear down the microphone, provider session, or task polling.
export default function AdministratorVoiceProvider({children}){
 const [identity,setIdentity]=useState(''),[config,setConfig]=useState(null);
 const callbacks=useRef(null),calling=useRef(false);
 const subscribe=useCallback(value=>{callbacks.current=value;return()=>{if(callbacks.current===value)callbacks.current=null;};},[]);
 const configure=useCallback(value=>setConfig(previous=>{
  // The call belongs to its original chat, including when that chat has no saved
  // messages yet. A newly mounted page cannot silently switch its conversation.
  const next=calling.current&&previous?{...value,sessionId:previous.sessionId}:value;
  if(previous&&previous.token===next.token&&previous.sessionId===next.sessionId&&previous.services===next.services&&previous.blocked===next.blocked)return previous;
  return next;
 }),[]);
 const voice=useAdministratorVoiceRuntime({token:identity,sessionId:config?.sessionId,services:config?.services,
  blocked:!identity||config?.token!==identity||Boolean(config?.blocked),
  onTask:task=>{notifyAdministratorChanges(task);callbacks.current?.onTask?.(task);},onTranscript:text=>callbacks.current?.onTranscript?.(text)});
 calling.current=voice.active;
 const stop=voice.stop;
 useEffect(()=>{
  const navigate=()=>{if(!/^\/admin(?:\/|$)/.test(window.location.pathname))stop();};
  window.addEventListener('echo:navigation',navigate);
  return()=>window.removeEventListener('echo:navigation',navigate);
 },[stop]);
 return <AdministratorVoiceContext.Provider value={{voice:{...voice,sessionId:config?.sessionId},configure,subscribe,setIdentity}}>{children}</AdministratorVoiceContext.Provider>;
}
