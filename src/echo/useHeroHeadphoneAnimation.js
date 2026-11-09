import {useEffect,useRef,useState} from 'react';
import {HERO_HEADPHONE_FRAMES as FRAMES,prepareHeroHeadphoneFrames} from './heroHeadphoneFrames';

const LAST=FRAMES.length-1;

export default function useHeroHeadphoneAnimation(startKey=0,onComplete){
 const sceneRef=useRef(null),completion=useRef(onComplete),currentFrame=useRef(0);
 completion.current=onComplete;
 const [frame,setFrame]=useState(0),[playing,setPlaying]=useState(false),[loaded,setLoaded]=useState(null),[preparationVersion,setPreparationVersion]=useState(0);
 useEffect(()=>{
  let alive=true;
  prepareHeroHeadphoneFrames({retry:preparationVersion>0}).then(images=>{if(alive)setLoaded(images);});
  return()=>{alive=false;};
 },[preparationVersion]);
 useEffect(()=>{
  const showFrame=value=>{currentFrame.current=value;setFrame(value);};
  if(!startKey){showFrame(0);setPlaying(false);return;}
  if(!loaded)return;
  let raf=0;
  const reverse=startKey<0;
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const poster=reverse?Math.max(0,loaded.findIndex(Boolean)):Math.max(0,loaded.lastIndexOf(true));
  const complete=()=>{setPlaying(false);if(!reverse)completion.current?.(startKey);};
  if(motion.matches||!loaded.every(Boolean)){showFrame(poster);complete();return;}
  const from=currentFrame.current,target=reverse?0:LAST,distance=Math.abs(target-from);
  if(!distance){complete();return;}
  setPlaying(true);
  const began=performance.now(),duration=2200*distance/LAST,direction=reverse?-1:1;
  const tick=now=>{
   const progress=Math.min(1,(now-began)/duration);
   showFrame(from+direction*Math.min(distance,Math.floor(progress*(distance+1))));
   if(progress<1)raf=requestAnimationFrame(tick);else complete();
  };
  raf=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(raf);
 },[startKey,loaded]);
 return {sceneRef,src:FRAMES[frame],frames:FRAMES,frame,playing,ready:Boolean(loaded?.every(Boolean)),failed:Boolean(loaded&&!loaded.every(Boolean)),retry:()=>{setLoaded(null);setPreparationVersion(value=>value+1);}};
}
