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
    const workspace=root.closest('.admin-workspace'),content=root.closest('.aw-content');
    const footer=workspace?.querySelector('.aw-workspace-footer');
    const viewport=window.visualViewport;
    const bottom=Math.min((viewport?.offsetTop||0)+(viewport?.height||window.innerHeight),content?.getBoundingClientRect().bottom??Infinity,footer?.getBoundingClientRect().top??Infinity);
    // Measure the actual CSS zoom rather than assuming the workspace is always at 90%.
    const zoom=dock.offsetWidth?dock.getBoundingClientRect().width/dock.offsetWidth:1;
    if(!zoom)return;
    const height=`${Math.floor(Math.max(0,bottom-Math.max(0,top))/zoom*100)/100}px`;
    if(root.style.getPropertyValue('--studio-workspace-height')!==height)root.style.setProperty('--studio-workspace-height',height);
   });
  };
  const observer=new ResizeObserver(measure);const content=root.closest('.aw-content');if(content)observer.observe(content);const footer=root.closest('.admin-workspace')?.querySelector('.aw-workspace-footer');if(footer)observer.observe(footer);
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
