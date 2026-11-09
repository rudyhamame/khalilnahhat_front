import {useEffect,useRef,useState} from 'react';
import {cloudAsset} from '../lib/cloudAsset';

const FRAMES=Array.from({length:8},(_,index)=>cloudAsset(`/echo/headphone-charcoal-v1/pose-${String(index).padStart(2,'0')}.webp`));
const LAST=FRAMES.length-1;

export default function useHeroHeadphoneAnimation(startKey=0,onComplete){
 const sceneRef=useRef(null),completion=useRef(onComplete);
 completion.current=onComplete;
 const [frame,setFrame]=useState(0),[playing,setPlaying]=useState(false),[loaded,setLoaded]=useState(null);
 useEffect(()=>{
  let alive=true;
  Promise.all(FRAMES.map(src=>new Promise(resolve=>{
   const image=new Image();image.onload=()=>image.decode().then(()=>resolve(true),()=>resolve(false));image.onerror=()=>resolve(false);image.src=src;
  }))).then(images=>{if(alive)setLoaded(images);});
  return()=>{alive=false;};
 },[]);
 useEffect(()=>{
  if(!startKey){setFrame(0);setPlaying(false);return;}
  if(!loaded)return;
  let raf=0;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const poster=Math.max(0,loaded.lastIndexOf(true));
  if(motion.matches||!loaded.every(Boolean)){setFrame(poster);setPlaying(false);completion.current?.(startKey);return;}
  setFrame(0);setPlaying(true);
  const began=performance.now();
  const tick=now=>{
   const progress=Math.min(1,(now-began)/2200);
   setFrame(Math.min(LAST,Math.floor(progress*FRAMES.length)));
   if(progress<1)raf=requestAnimationFrame(tick);else{setPlaying(false);completion.current?.(startKey);}
  };
  raf=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(raf);
 },[startKey,loaded]);
 return {sceneRef,src:FRAMES[frame],frame,playing};
}
