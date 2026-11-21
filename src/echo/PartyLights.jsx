import {useEffect,useRef} from 'react';
import './partyLights.css';

// Vibe lighting for the mixer background: one soft, harmonised colour atmosphere. The hue drifts slowly and follows the music (faster and brighter with the energy),
// the glow breathes with the beat. No beams, strobes or LEDs: just colour. Values are written straight to CSS variables (no re-render).
export default function PartyLights(){
 const root=useRef(null);
 useEffect(()=>{
  const node=root.current;if(!node)return undefined;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let hue=200,energy=0,pulse=0,last=performance.now(),live=false;
  const write=()=>{
   node.style.setProperty('--hue',(((hue%360)+360)%360).toFixed(1));
   node.style.setProperty('--e',energy.toFixed(3));
   node.style.setProperty('--p',pulse.toFixed(3));
  };
  const frame=event=>{
   const d=event.detail||{},on=Boolean(d.playing&&d.audible!==false);live=on;
   energy+=((on?d.energy||0:0)-energy)*.12;               // slow, smooth follow of the loudness
   pulse+=((on?d.pulse||0:0)-pulse)*(on&&(d.pulse||0)>pulse?.35:.08);// gentle swell on each beat
  };
  window.addEventListener('echo:music-frame',frame);
  const timer=setInterval(()=>{
   const now=performance.now(),dt=Math.min(.5,(now-last)/1000);last=now;
   hue+=(reduced?2:(live?5+energy*22:4))*dt;               // the whole palette turns slowly together
   if(!live){energy*=.96;pulse*=.9;}
   write();
  },60);
  write();
  return()=>{window.removeEventListener('echo:music-frame',frame);clearInterval(timer);};
 },[]);
 return <div ref={root} className="party-lights" aria-hidden="true"><div className="pl-wash"/><div className="pl-glow"/></div>;
}
