import {useEffect,useRef,useState} from 'react';
import {advanceMeter,createStudioMeter,emptyMeter,meterPosition} from '../lib/studioMeter';
const idle=()=>({...emptyMeter(),db:-Infinity,status:'idle'});
export default function useStudioMeter(stream){
 const [state,setState]=useState(idle),reset=useRef(()=>{});
 useEffect(()=>{
  setState(idle());reset.current=()=>{};
  if(!stream)return undefined;
  let meter,frame=0,stopped=false,last=0,ballistics=emptyMeter();
  try{meter=createStudioMeter(stream);}catch{setState({...idle(),status:'unavailable'});return undefined;}
  const resume=()=>{void meter.resume().catch(()=>{if(!stopped)setState(previous=>({...previous,status:'waiting'}));});};
  const tick=now=>{
   if(stopped)return;
   if(now-last>=1000/30){
    const reading=meter.read();ballistics=advanceMeter(ballistics,reading.db,last?(now-last)/1000:0);last=now;
    setState({...ballistics,...reading});
   }
   frame=requestAnimationFrame(tick);
  };
  reset.current=()=>{ballistics={...ballistics,clip:false};setState(previous=>({...previous,clip:false}));};
  resume();frame=requestAnimationFrame(tick);
  // Safari may suspend a context created after capture permission. Retry on a user gesture.
  for(const event of ['pointerdown','touchend','keydown'])window.addEventListener(event,resume,{passive:true});
  return()=>{stopped=true;cancelAnimationFrame(frame);for(const event of ['pointerdown','touchend','keydown'])window.removeEventListener(event,resume);meter.stop();reset.current=()=>{};};
 },[stream]);
 return {...state,level:meterPosition(state.levelDb),peak:meterPosition(state.peakDb),resetClip:()=>reset.current()};
}
