import {useCallback,useEffect,useRef} from 'react';
import taskReadySound from '../assets/audio/ai-task-ready.wav';

export function useAiTaskNotification(){
 const player=useRef(null);
 useEffect(()=>{
  let disposed=false,context=null,decoded=null;
  const sources=new Set();
  const bytes=fetch(taskReadySound).then(response=>{if(!response.ok)throw Error('Audio unavailable');return response.arrayBuffer();});
  // Preload silently. Browsers require a user gesture before audio can play.
  bytes.catch(()=>{});
  const decode=()=>decoded||(decoded=bytes.then(data=>context.decodeAudioData(data.slice(0))));
  const unlock=()=>{
   if(disposed)return;
   const AudioContext=window.AudioContext||window.webkitAudioContext;
   if(!AudioContext)return;
   try{
    context ||= new AudioContext();
    context.resume().catch(()=>{});decode().catch(()=>{});
   }catch{/* The visible task remains available when audio is blocked. */}
  };
  player.current=async()=>{
   if(disposed||!context||context.state!=='running')return;
   try{
    const buffer=await decode();
    if(disposed||context.state!=='running')return;
    const source=context.createBufferSource(),volume=context.createGain();
    source.buffer=buffer;volume.gain.value=.7;source.connect(volume);volume.connect(context.destination);
    sources.add(source);source.onended=()=>{sources.delete(source);source.disconnect();volume.disconnect();};source.start();
   }catch{/* Notification audio must not block creating or confirming tasks. */}
  };
  document.addEventListener('pointerdown',unlock,{passive:true});
  document.addEventListener('keydown',unlock);
  return()=>{
   disposed=true;player.current=null;
   document.removeEventListener('pointerdown',unlock);document.removeEventListener('keydown',unlock);
   for(const source of sources){try{source.stop();}catch{/* Already ended. */}}
   context?.close().catch(()=>{});
  };
 },[]);
 return useCallback(()=>{player.current?.();},[]);
}
