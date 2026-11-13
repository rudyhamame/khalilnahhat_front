import {useEffect} from 'react';
import {createLiveKeyTracker,spectrumChroma} from '../lib/liveVocalKey';

export function useAutoVocalKey({stream,enabled,onKey,AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext}){
 useEffect(()=>{
  onKey(null);if(!enabled||!stream||!AudioContextClass)return undefined;
  const context=new AudioContextClass(),source=context.createMediaStreamSource(stream),analyser=context.createAnalyser();
  analyser.fftSize=16384;analyser.smoothingTimeConstant=0;source.connect(analyser);
  const bins=new Float32Array(analyser.frequencyBinCount),tracker=createLiveKeyTracker();
  void context.resume().catch(()=>{});
  const timer=setInterval(()=>{analyser.getFloatFrequencyData(bins);onKey(tracker.push(spectrumChroma(bins,context.sampleRate,analyser.fftSize),performance.now()));},500);
  return()=>{clearInterval(timer);source.disconnect();void context.close().catch(()=>{});onKey(null);};
 },[stream,enabled,onKey,AudioContextClass]);
}
