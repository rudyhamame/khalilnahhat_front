import {useEffect,useState} from 'react';

export function useStudioWorkspaceLayout({liveFrame,settingsArea}) {
 const [liveFullscreen,setLiveFullscreen]=useState(false);
 useEffect(()=>{
  const pair=liveFrame.current;if(!pair)return undefined;
  const head=pair.querySelector('.studio-preview-window[aria-label="Landscape preview"] .studio-preview-window-head');
  const sync=()=>{
   const currentHead=pair.querySelector('.studio-preview-window[aria-label="Landscape preview"] .studio-preview-window-head');
   pair.style.setProperty('--landscape-head',`${currentHead?.offsetHeight||0}px`);
  };
  sync();const observer=new ResizeObserver(sync);observer.observe(pair);if(head)observer.observe(head);
  return()=>observer.disconnect();
 },[liveFrame]);
 useEffect(()=>{
  const dock=settingsArea.current,root=dock?.closest('#admin-live-stream');if(!root)return undefined;
  let frame;
  const measure=()=>{
   cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{
    const top=dock.getBoundingClientRect().top;
    const footer=root.closest('.admin-workspace')?.querySelector('.aw-workspace-footer');
    const bottom=window.innerHeight-(footer?.getBoundingClientRect().height||0);
    root.style.setProperty('--studio-workspace-height',`${Math.max(240,bottom-Math.max(0,top))/.9}px`);
   });
  };
  const observer=new ResizeObserver(measure);if(root.firstElementChild)observer.observe(root.firstElementChild);
  window.addEventListener('resize',measure);document.addEventListener('fullscreenchange',measure);measure();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.removeEventListener('resize',measure);document.removeEventListener('fullscreenchange',measure);};
 },[settingsArea]);
 useEffect(()=>{
  const sync=()=>setLiveFullscreen(document.fullscreenElement===liveFrame.current);
  sync();document.addEventListener('fullscreenchange',sync);
  return()=>document.removeEventListener('fullscreenchange',sync);
 },[liveFrame]);
 const toggleLiveFullscreen=()=>{if(document.fullscreenElement)document.exitFullscreen?.();else liveFrame.current?.requestFullscreen?.().catch(()=>{});};
 return {liveFullscreen,toggleLiveFullscreen};
}
