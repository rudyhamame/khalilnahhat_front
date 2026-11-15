import {useEffect,useRef,useState} from 'react';
import {recommendedRoomSize} from './simulationLayout';

// The real 3D Room (same engine as the 3D Room page) as a hands-off preview inside the greeting: empty room, 80 guests, slow turn.
export default function HeroRoomPreview({active,reducedMotion}){
 const host=useRef(null),engine=useRef(null),live=useRef(active),mode=useRef('day'),[ready,setReady]=useState(false);
 live.current=active;
 useEffect(()=>{
  let disposed=false;const size=recommendedRoomSize(80);
  import('./setupSimulationEngine').then(({createSetupSimulation})=>{
   if(disposed)return;
   return createSetupSimulation(host.current,{width:size.width,depth:size.depth,boundary:null,holes:[],items:[],positions:{},grid:false,guests:80,active:live,mode,transparentBackground:true,equipmentIndicators:false,backgroundColor:getComputedStyle(host.current.closest('.echo')).backgroundColor},()=>{},()=>{});
  }).then(value=>{if(!value)return;if(disposed)value.dispose();else{engine.current=value;value.zoom(1.35);/* the room is wide: pull back so no wall is cut by the box, even while it turns */setReady(true);}}).catch(()=>{/* The caption still shows without WebGL. */});
  return()=>{disposed=true;engine.current?.dispose();engine.current=null;};
 },[]);
 // ponytail: constant slow orbit; the engine has no auto-rotate of its own.
 useEffect(()=>{
  if(!ready||!active||reducedMotion)return undefined;
  let frame=0,last=performance.now();
  const tick=time=>{engine.current?.orbit((time-last)*.00018,0);last=time;frame=requestAnimationFrame(tick);};
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[ready,active,reducedMotion]);
 return <div ref={host} className="hero-room-preview" aria-hidden="true"/>;
}
