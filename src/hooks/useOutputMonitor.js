import {useCallback,useEffect,useRef,useState} from 'react';
/**
 * Listen to the live output mix (the very audio track that is published) with a level control and a meter.
 * Starts muted so a microphone near the speakers cannot feed back; the admin turns it on, ideally with headphones.
 */
export function useOutputMonitor(track,{AudioContextClass=globalThis.AudioContext||globalThis.webkitAudioContext,raf=globalThis.requestAnimationFrame,caf=globalThis.cancelAnimationFrame}={}){
  const [volume,setVolumeState]=useState(()=>{try{const saved=Number(localStorage.getItem('echo-monitor-volume'));return Number.isFinite(saved)&&saved>=0&&saved<=1?saved:.8;}catch{return .8;}});
  const [muted,setMuted]=useState(true),[level,setLevel]=useState(0),[peak,setPeak]=useState(0),[clip,setClip]=useState(false);
  const gain=useRef(null),volumeRef=useRef(volume),mutedRef=useRef(muted);
  volumeRef.current=volume;mutedRef.current=muted;
  const setVolume=useCallback(value=>{const next=Math.max(0,Math.min(1,Number(value)||0));setVolumeState(next);try{localStorage.setItem('echo-monitor-volume',String(next));}catch{/* The level still applies. */}},[]);
  const apply=useCallback(()=>{const node=gain.current;if(node)node.gain.setTargetAtTime(mutedRef.current?0:volumeRef.current,node.context.currentTime,.02);},[]);
  useEffect(()=>{apply();},[volume,muted,apply]);
  useEffect(()=>{
    if(!track||!AudioContextClass){setLevel(0);return undefined;}
    const context=new AudioContextClass(),source=context.createMediaStreamSource(new MediaStream([track])),analyser=context.createAnalyser(),output=context.createGain();
    analyser.fftSize=1024;output.gain.value=0;gain.current=output;
    // The meter reads the mix before the monitor level, so it keeps moving while muted; sound reaches the speakers only through the gain.
    source.connect(analyser);source.connect(output);output.connect(context.destination);apply();
    const data=new Uint8Array(analyser.fftSize);let frame=0,stopped=false,held=0,heldAt=0,clipAt=0;
    const tick=()=>{
      if(stopped)return;analyser.getByteTimeDomainData(data);let now=0;for(const value of data)now=Math.max(now,Math.abs(value-128)/128);
      setLevel(previous=>now>previous?now:previous*.82+now*.18);
      // Peak hold: the marker stays about a second, then falls. Clip: a hot signal lights the lamp for a couple of seconds.
      const time=performance.now();if(now>=held){held=now;heldAt=time;}else if(time-heldAt>1100)held*=.94;setPeak(held);
      if(now>=.98)clipAt=time;setClip(clipAt>0&&time-clipAt<2000);
      frame=raf(tick);};
    frame=raf(tick);void context.resume?.().catch(()=>{});
    return()=>{stopped=true;caf(frame);gain.current=null;try{source.disconnect();output.disconnect();}catch{/* Already closed. */}void context.close().catch(()=>{});setLevel(0);setPeak(0);setClip(false);};
  },[track,AudioContextClass,raf,caf,apply]);
  // Browsers only start audio from a user action: turning the monitor on is one.
  const toggleMute=useCallback(()=>{setMuted(value=>!value);},[]);
  return {volume,setVolume,muted,toggleMute,level,peak,clip,active:Boolean(track)};
}
