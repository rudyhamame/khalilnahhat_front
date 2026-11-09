import {useEffect} from 'react';
import {APP_VIEWPORT_TARGETS} from '../lib/bookingViewport';
import './viewportNavigation.css';

const CHAPTERS=['seasonal-tree-viewport','live','echo-ai','availability','khalil-work-archive','services','contact','about-dj-khalil'];
const NAVIGATION_SOURCES=new Set(['section-nav','navigation']);

export function useViewportAlignment(resetVersion=0,seasonalEnabled=false,contentReady=true){
 useEffect(()=>{
  const root=document.documentElement;
  root.classList.add('echo-nav-only-scroll');
  const hero=document.querySelector('.echo-artist-sequence');
  const viewports=[hero,...CHAPTERS.map(id=>document.getElementById(id))].filter(Boolean);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,touch=null;
  const blocked=()=>document.querySelector('dialog[open],#echo-navigation.is-open,.event-order-layout.is-reviewing');
  const offset=()=>Math.max(0,document.querySelector('.echo-header')?.getBoundingClientRect().bottom||0);
  const destination=element=>Math.max(0,Math.min(root.scrollHeight-innerHeight,element===hero?0:scrollY+element.getBoundingClientRect().top-offset()));
  let active=viewports.reduce((best,node)=>!best||Math.abs(node.getBoundingClientRect().top-offset())<Math.abs(best.getBoundingClientRect().top-offset())?node:best,null);
  const previousInert=new Map(viewports.map(element=>[element,element.inert]));
  const activate=element=>{active=element;viewports.forEach(viewport=>{viewport.inert=viewport!==element;});};
  if(active)activate(active);
  const cancel=()=>{cancelAnimationFrame(frame);frame=0;};
  const animate=element=>{
   cancel();activate(element);
   const start=scrollY,began=performance.now(),duration=Math.min(900,Math.max(620,Math.abs(destination(element)-start)*.65));
   if(motion.matches){scrollTo({top:destination(element),behavior:'instant'});return;}
   const tick=now=>{
    if(blocked()){cancel();return;}
    const t=Math.min(1,(now-began)/duration),eased=t*t*t*(t*(t*6-15)+10);
    scrollTo({top:start+(destination(element)-start)*eased,behavior:'instant'});
    if(t<1)frame=requestAnimationFrame(tick);else frame=0;
   };
   frame=requestAnimationFrame(tick);
  };
  const navigate=event=>{
   // Consume disallowed requests too, so callers cannot fall back to native scrolling.
   event.preventDefault();
   if(blocked()||!NAVIGATION_SOURCES.has(event.detail?.source))return;
   const section=event.detail?.section;
   if(!Object.hasOwn(APP_VIEWPORT_TARGETS,section))return;
   const element=document.querySelector(APP_VIEWPORT_TARGETS[section]);
   if(element&&viewports.includes(element))animate(element);
  };
  const canScrollInside=(target,delta,axis='y')=>{
   for(let node=target;node&&node!==document.body&&node!==root;node=node.parentElement){
    if(viewports.includes(node))continue;
    const style=getComputedStyle(node),vertical=axis==='y';
    if(!/auto|scroll/.test(vertical?style.overflowY:style.overflowX))continue;
    const size=vertical?node.clientHeight:node.clientWidth,total=vertical?node.scrollHeight:node.scrollWidth,position=vertical?node.scrollTop:node.scrollLeft;
    if(total>size+2&&(delta<0?position>1:position+size<total-1))return true;
   }
   return false;
  };
  const prevent=event=>{if(event.cancelable!==false)event.preventDefault();};
  const wheel=event=>{
   if(event.defaultPrevented||event.ctrlKey||blocked())return;
   const horizontal=Math.abs(event.deltaX)>Math.abs(event.deltaY),delta=horizontal?event.deltaX:event.deltaY;
   if(delta&&!canScrollInside(event.target,delta,horizontal?'x':'y'))prevent(event);
  };
  const key=event=>{
   if(event.defaultPrevented||blocked()||!['PageDown','PageUp',' ','Home','End','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
   if(event.target.closest?.('input,textarea,select,[contenteditable=true],[role=slider]'))return;
   if(event.key===' '&&event.target.closest?.('button,a[href]'))return;
   const direction=['PageUp','Home','ArrowUp','ArrowLeft'].includes(event.key)||event.key===' '&&event.shiftKey?-1:1;
   if(!canScrollInside(event.target,direction,['ArrowLeft','ArrowRight'].includes(event.key)?'x':'y'))prevent(event);
  };
  const touchStart=event=>{touch=event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;};
  const touchMove=event=>{
   if(!touch||event.touches.length!==1||blocked())return;
   const point=event.touches[0],x=touch.x-point.clientX,y=touch.y-point.clientY,horizontal=Math.abs(x)>Math.abs(y),delta=horizontal?x:y;
   if(delta&&!canScrollInside(event.target,delta,horizontal?'x':'y'))prevent(event);
  };
  const touchEnd=()=>{touch=null;};
  const resize=()=>{cancel();if(active)frame=requestAnimationFrame(()=>{scrollTo({top:destination(active),behavior:'instant'});frame=0;});};
  window.addEventListener('echo:viewport-navigate',navigate);
  window.addEventListener('wheel',wheel,{passive:false});
  window.addEventListener('keydown',key);
  window.addEventListener('touchstart',touchStart,{passive:true});
  window.addEventListener('touchmove',touchMove,{passive:false});
  window.addEventListener('touchend',touchEnd,{passive:true});
  window.addEventListener('touchcancel',touchEnd,{passive:true});
  window.addEventListener('resize',resize);
  return()=>{
   cancel();previousInert.forEach((value,element)=>{element.inert=value;});root.classList.remove('echo-nav-only-scroll');
   window.removeEventListener('echo:viewport-navigate',navigate);
   window.removeEventListener('wheel',wheel);
   window.removeEventListener('keydown',key);
   window.removeEventListener('touchstart',touchStart);
   window.removeEventListener('touchmove',touchMove);
   window.removeEventListener('touchend',touchEnd);
   window.removeEventListener('touchcancel',touchEnd);
   window.removeEventListener('resize',resize);
  };
 },[resetVersion,seasonalEnabled,contentReady]);
}
