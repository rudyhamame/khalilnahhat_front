import {useEffect,useState} from 'react';
import {duckStep,DUCK_DEFAULTS} from '../lib/autoDuck';
/**
 * Auto leveling: watches the voice microphone and lowers the audio input while you speak. Returns true while it is ducking.
 * It stops, and gives the level back, when turned off, when the mic goes off, or when the Studio closes.
 */
export function useAutoDuck({stream,enabled,setDuck,options=DUCK_DEFAULTS,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext}){
  const [ducking,setDucking]=useState(false);
  useEffect(()=>{
    if(!enabled||!stream||!AudioContextClass){setDucking(false);return undefined;}
    const context=new AudioContextClass(),analyser=context.createAnalyser(),source=context.createMediaStreamSource(stream);analyser.fftSize=512;source.connect(analyser);
    const data=new Uint8Array(analyser.fftSize);let state={factor:1,speakingUntil:0},frame=0,stopped=false;
    const tick=()=>{
      if(stopped)return;analyser.getByteTimeDomainData(data);let peak=0;for(const value of data)peak=Math.max(peak,Math.abs(value-128)/128);
      state=duckStep(state,peak,performance.now(),options);
      // Attack is quick so the first word is clear; release is slower so the level does not pump between words.
      if(state.changed){setDuck(state.factor,state.factor<1?.04:.35);setDucking(state.factor<1);}
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{stopped=true;cancelAnimationFrame(frame);setDuck(1,.1);setDucking(false);try{source.disconnect();}catch{/* Closed. */}void context.close().catch(()=>{});};
  },[stream,enabled,setDuck,options,AudioContextClass]);
  return ducking;
}
