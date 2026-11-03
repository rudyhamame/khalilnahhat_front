import { useEffect, useRef } from 'react';
import './preflightPhotoWall.css';

export const PREFLIGHT_ATLAS='https://res.cloudinary.com/nqiooluk/image/upload/v1793064134/khalil/site-assets/faf85f3d2dcc/echo/preflight-performance-wall-v1.webp';

export default function PreflightPhotoWall({audio}) {
  const wall=useRef(null);
  useEffect(()=>{
    const element=audio.current;
    if(!element)return undefined;
    const reduced=matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,stopped=false,last=0;
    const rest=()=>{cancelAnimationFrame(frame);frame=0;wall.current?.style.setProperty('--wall-energy','0');wall.current?.style.setProperty('--wall-hit','0');};
    const tick=time=>{
      if(stopped||element.paused||element.ended){rest();return;}
      frame=requestAnimationFrame(tick);
      if(time-last<30)return;last=time;
      // The wall is decorative. Follow the playback clock without routing the
      // greeting through Web Audio (which can mute cross-origin media or close early).
      const beat=(1+Math.sin(element.currentTime*Math.PI*3.6))/2;
      const energy=.12+beat*.32;
      const hit=Math.pow(beat,8)*.45;
      if(!reduced.matches){wall.current?.style.setProperty('--wall-energy',energy.toFixed(3));wall.current?.style.setProperty('--wall-hit',hit.toFixed(3));}
    };
    const start=()=>{
      if(reduced.matches||stopped||element.paused)return;
      rest();frame=requestAnimationFrame(tick);
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
    };
  },[audio]);
  return <div ref={wall} className="preflight-photo-wall" aria-hidden="true">
    <div className="preflight-photo-grid">{Array.from({length:216},(_,index)=>{
      const cell=(index*7+Math.floor(index/18)*3)%16;
      return <span key={index} className="preflight-photo-brick" style={{backgroundPosition:`${cell%4*100/3}% ${Math.floor(cell/4)*100/3}%`,'--brick-depth':(index%5-2)*28,'--brick-shift':(index%3-1)*5,'--brick-light':.52+(index%4)*.11}}/>;
    })}</div>
  </div>;
}
