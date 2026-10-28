import {useEffect,useState} from 'react';

// Observe the stationary chapter, never a card that the animation moves or clips.
// A chapter counts as reached once its top edge passes the middle of the screen (the bottom 45% of the viewport is excluded),
// so tall chapters on tablets do not animate while they are still mostly below the fold.
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
        // 'in' while any part of the chapter is above the viewport's mid-line; 'above'/'below' once it has left through that side.
        setPhase(entry.isIntersecting?'in':entry.boundingClientRect.bottom<=0?'above':'below');
      },{rootMargin:'0px 0px -45% 0px',threshold:0});
      observer.observe(element);
    };
    watch();
    motion.addEventListener('change',watch);
    return()=>{observer?.disconnect();motion.removeEventListener('change',watch);};
  },[ref]);
  return phase;
}
