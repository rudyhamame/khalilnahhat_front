import { useEffect, useRef } from 'react';
import './preflightPhotoWall.css';

export const PREFLIGHT_ATLAS='/echo/preflight-performance-wall-v1.webp';

export default function PreflightPhotoWall({audio}) {
  const wall=useRef(null);
  useEffect(()=>{
    const element=audio.current;
    if(!element)return undefined;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let graph,frame=0,stopped=false,last=0,previousBass=0,envelope=0;
    const rest=()=>{cancelAnimationFrame(frame);frame=0;wall.current?.style.setProperty('--wall-energy','0');wall.current?.style.setProperty('--wall-hit','0');};
    const tick=time=>{
      if(stopped||element.paused||element.ended){rest();return;}
      frame=requestAnimationFrame(tick);
      if(time-last<30)return;last=time;
      graph.analyser.getFloatTimeDomainData(graph.wave);
      graph.analyser.getByteFrequencyData(graph.spectrum);
      let squares=0;for(const value of graph.wave)squares+=value*value;
      let bass=0;const end=Math.min(graph.spectrum.length,Math.ceil(220*graph.analyser.fftSize/graph.context.sampleRate));
      for(let i=1;i<end;i++)bass+=graph.spectrum[i]/255;
      bass/=Math.max(1,end-1);
      const energy=Math.min(1,Math.sqrt(squares/graph.wave.length)*5);
      const attack=Math.max(0,bass-previousBass);previousBass=bass;
      envelope=Math.max(envelope*.82,Math.min(1,attack*5));
      if(!reduced.matches){wall.current?.style.setProperty('--wall-energy',energy.toFixed(3));wall.current?.style.setProperty('--wall-hit',envelope.toFixed(3));}
    };
    const start=async()=>{
      if(reduced.matches||stopped)return;
      const Context=window.AudioContext||window.webkitAudioContext;
      if(!Context)return;
      try{
        if(!graph){
          const context=new Context();
          const source=context.createMediaElementSource(element);
          // Preserve greeting audio even if optional analysis cannot initialize.
          source.connect(context.destination);
          graph={context,source};
          const analyser=context.createAnalyser();analyser.fftSize=1024;analyser.smoothingTimeConstant=.25;
          source.connect(analyser);Object.assign(graph,{analyser,wave:new Float32Array(analyser.fftSize),spectrum:new Uint8Array(analyser.frequencyBinCount)});
        }
        await graph.context.resume();
        if(stopped||!graph.analyser||element.paused)return;
        rest();frame=requestAnimationFrame(tick);
      }catch{ /* Greeting remains playable without animated tiles. */ }
    };
    const motionChange=()=>{if(reduced.matches)rest();else if(!element.paused)start();};
    element.addEventListener('play',start);
    for(const event of ['pause','ended','waiting'])element.addEventListener(event,rest);
    element.addEventListener('playing',start);
    reduced.addEventListener('change',motionChange);
    if(!element.paused)start();
    return()=>{
      stopped=true;rest();element.removeEventListener('play',start);element.removeEventListener('playing',start);
      for(const event of ['pause','ended','waiting'])element.removeEventListener(event,rest);
      reduced.removeEventListener('change',motionChange);
      graph?.source.disconnect();graph?.analyser?.disconnect();graph?.context.close().catch(()=>{});
    };
  },[audio]);
  return <div ref={wall} className="preflight-photo-wall" aria-hidden="true">
    <div className="preflight-photo-grid">{Array.from({length:216},(_,index)=>{
      const cell=(index*7+Math.floor(index/18)*3)%16;
      return <span key={index} className="preflight-photo-brick" style={{backgroundPosition:`${cell%4*100/3}% ${Math.floor(cell/4)*100/3}%`,'--brick-depth':(index%5-2)*28,'--brick-shift':(index%3-1)*5,'--brick-light':.52+(index%4)*.11}}/>;
    })}</div>
  </div>;
}
