import {useEffect,useState} from 'react';

// Observe the stationary chapter, never a card that the animation moves or clips.
// Any visible part keeps it revealed, even when a chapter is taller than the screen.
export function useViewportPhase(ref) {
  const [phase,setPhase]=useState('in');
  useEffect(()=>{
    const element=ref.current?.closest('section');
    if(!element||typeof IntersectionObserver==='undefined')return undefined;
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let observer;
    const watch=()=>{
      observer?.disconnect();
      setPhase('in');
      if(motion.matches)return;
      observer=new IntersectionObserver(entries=>{
        const entry=entries.at(-1);
        if(!entry)return;
        // Start before entry and only reset beyond this buffer. This also avoids
        // an outro flashing on screen during small scroll/resize adjustments.
        setPhase(entry.isIntersecting?'in':entry.boundingClientRect.bottom<=0?'above':'below');
      },{rootMargin:'120px 0px',threshold:0});
      observer.observe(element);
    };
    watch();
    motion.addEventListener('change',watch);
    return()=>{observer?.disconnect();motion.removeEventListener('change',watch);};
  },[ref]);
  return phase;
}
