import {useEffect,useRef,useState} from 'react';
import {APP_VIEWPORT_TARGETS} from '../lib/bookingViewport';
import {canScrollWithinViewport,isModelViewerInteraction} from './viewportScroll';
import {createViewportScroller} from './viewportScroller';
import './viewportNavigation.css';

const CHAPTERS=['seasonal-tree-viewport','live','availability','khalil-work-archive','services','echo-ai','room-3d','contact','about-dj-khalil'];
const NAVIGATION_SOURCES=new Set(['section-nav','navigation']);

export function useViewportAlignment(resetVersion=0,seasonalEnabled=false,contentReady=true){
 // The chapter you were on survives a refresh (per tab).
 const intent=useRef((()=>{try{const saved=sessionStorage.getItem('echo-home-section');return saved&&saved!=='home'&&Object.hasOwn(APP_VIEWPORT_TARGETS,saved)?saved:null;}catch{return null;}})());
 const restoring=useRef(Boolean(intent.current));
 // For a few seconds after a refresh restore, layout above the chapter may still shift; fix the offset instantly instead of gliding there (that glide is the second scroll visitors saw).
 const settleUntil=useRef(0);
 // The remembered chapter may mount after this hook first runs (lazy sections). Wait for it, then run the alignment effect again so it restores once.
 const [targetReady,setTargetReady]=useState(false);
 useEffect(()=>{
  if(!intent.current||!restoring.current)return undefined;
  let tries=0;
  const timer=setInterval(()=>{
   const found=document.querySelector(APP_VIEWPORT_TARGETS[intent.current]);
   if(found||++tries>100){clearInterval(timer);if(!found)restoring.current=false;setTargetReady(true);}
  },100);
  return()=>clearInterval(timer);
 },[]);
 useEffect(()=>{
  const root=document.documentElement;
  root.classList.add('echo-nav-only-scroll');
  const hero=document.querySelector('.echo-artist-sequence');
  const viewports=[hero,...CHAPTERS.map(id=>document.getElementById(id))].filter(Boolean);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let touch=null,alignmentFrame=0;
  const blocked=()=>document.querySelector('dialog[open],#echo-navigation.is-open,.event-order-layout.is-reviewing');
  const offset=()=>{const header=document.querySelector('.echo-header');if(!header)return 0;const position=getComputedStyle(header).position;return ['fixed','sticky'].includes(position)?Math.max(0,header.getBoundingClientRect().bottom):0;};
  const destination=element=>Math.max(0,Math.min(root.scrollHeight-innerHeight,element===hero?0:scrollY+element.getBoundingClientRect().top-offset()));
  if(!contentReady)intent.current='home';
  const remembered=intent.current&&document.querySelector(APP_VIEWPORT_TARGETS[intent.current]);
  let active=remembered&&viewports.includes(remembered)?remembered:viewports.reduce((best,node)=>!best||Math.abs(node.getBoundingClientRect().top-offset())<Math.abs(best.getBoundingClientRect().top-offset())?node:best,null);
  // Until the remembered chapter exists, do not re-align to the hero (that is the first screen flashing before the real destination).
  const pendingRestore=Boolean(restoring.current&&intent.current&&!(remembered&&viewports.includes(remembered)));
  const previousInert=new Map(viewports.map(element=>[element,element.inert]));
  const activate=element=>{active=element;viewports.forEach(viewport=>{viewport.inert=viewport!==element;});};
  if(active)activate(active);
  const announce=status=>{root.classList.toggle('echo-viewport-moving',status==='start');window.dispatchEvent(new CustomEvent('echo:viewport-transition',{detail:{section:intent.current,status}}));};
  const mover=createViewportScroller({
   read:()=>window.scrollY,write:top=>window.scrollTo({top,behavior:'instant'}),
   requestFrame:requestAnimationFrame,cancelFrame:cancelAnimationFrame,now:()=>performance.now(),viewportHeight:()=>window.innerHeight,
   reducedMotion:()=>motion.matches,blocked,onFinish:status=>announce(status),
  });
  const activeDestination=()=>{
   const current=intent.current&&document.querySelector(APP_VIEWPORT_TARGETS[intent.current]);
   if(current&&viewports.includes(current))active=current;
   return active?.isConnected?destination(active):NaN;
  };
  if(remembered&&restoring.current&&contentReady){restoring.current=false;settleUntil.current=performance.now()+6000;const top=activeDestination();if(Number.isFinite(top))window.scrollTo({top,behavior:'instant'});}
  else if(remembered&&Math.abs(activeDestination()-scrollY)>.75){if(performance.now()<settleUntil.current){const top=activeDestination();if(Number.isFinite(top))window.scrollTo({top,behavior:'instant'});}else{announce('start');if(!mover.navigate(activeDestination))announce('cancelled');}}
  const navigate=event=>{
   // Consume disallowed requests too, so callers cannot fall back to native scrolling.
   event.preventDefault();
   if(blocked()||!NAVIGATION_SOURCES.has(event.detail?.source))return;
   const section=event.detail?.section;
   if(!Object.hasOwn(APP_VIEWPORT_TARGETS,section))return;
   const element=document.querySelector(APP_VIEWPORT_TARGETS[section]);
   if(element&&viewports.includes(element)){intent.current=section;try{sessionStorage.setItem('echo-home-section',section);}catch{/* Not remembered. */}activate(element);announce('start');if(!mover.navigate(activeDestination))announce('cancelled');}
  };
  const prevent=event=>{if(event.cancelable!==false)event.preventDefault();};
  const wheel=event=>{
   if(event.defaultPrevented||event.ctrlKey||blocked()||isModelViewerInteraction(event))return;
   const horizontal=Math.abs(event.deltaX)>Math.abs(event.deltaY),delta=horizontal?event.deltaX:event.deltaY;
   if(delta&&!canScrollWithinViewport(event.target,delta,horizontal?'x':'y'))prevent(event);
  };
  const key=event=>{
   if(event.defaultPrevented||blocked()||isModelViewerInteraction(event)||!['PageDown','PageUp',' ','Home','End','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.key))return;
   if(event.target.closest?.('input,textarea,select,[contenteditable=true],[role=slider]'))return;
   if(event.key===' '&&event.target.closest?.('button,a[href]'))return;
   const direction=['PageUp','Home','ArrowUp','ArrowLeft'].includes(event.key)||event.key===' '&&event.shiftKey?-1:1;
   if(!canScrollWithinViewport(event.target,direction,['ArrowLeft','ArrowRight'].includes(event.key)?'x':'y'))prevent(event);
  };
  const touchStart=event=>{touch=!isModelViewerInteraction(event)&&event.touches.length===1?{x:event.touches[0].clientX,y:event.touches[0].clientY}:null;};
  const touchMove=event=>{
   if(!touch||event.touches.length!==1||blocked())return;
   const point=event.touches[0],x=touch.x-point.clientX,y=touch.y-point.clientY,horizontal=Math.abs(x)>Math.abs(y),delta=horizontal?x:y;
   if(delta&&!canScrollWithinViewport(event.target,delta,horizontal?'x':'y'))prevent(event);
  };
  const touchEnd=()=>{touch=null;};
  const resize=()=>{
   if(window.visualViewport&&Math.abs(window.visualViewport.scale-1)>.01){mover.cancel();return;}
   // The on-screen keyboard resizes the viewport while typing (comments, requests); re-aligning then makes the page jump.
   if(document.activeElement?.matches?.('input,textarea,select,[contenteditable]'))return;
   if(alignmentFrame)cancelAnimationFrame(alignmentFrame);
   alignmentFrame=requestAnimationFrame(()=>{alignmentFrame=0;if(pendingRestore)return;if(performance.now()<settleUntil.current){const top=activeDestination();if(Number.isFinite(top)&&Math.abs(top-scrollY)>.75)window.scrollTo({top,behavior:'instant'});return;}if(active&&!mover.running){mover.refresh(activeDestination);if(mover.running)announce('start');}});
  };
  const motionChange=()=>{if(active)mover.navigate(activeDestination);};
  const sizes=new ResizeObserver(resize);
  viewports.forEach(viewport=>sizes.observe(viewport));
  window.addEventListener('echo:viewport-navigate',navigate);
  window.addEventListener('wheel',wheel,{passive:false});
  window.addEventListener('keydown',key);
  window.addEventListener('touchstart',touchStart,{passive:true});
  window.addEventListener('touchmove',touchMove,{passive:false});
  window.addEventListener('touchend',touchEnd,{passive:true});
  window.addEventListener('touchcancel',touchEnd,{passive:true});
  window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);motion.addEventListener('change',motionChange);
  const afterTyping=()=>setTimeout(resize,200);window.addEventListener('focusout',afterTyping);
  return()=>{window.removeEventListener('focusout',afterTyping);
   mover.cancel();cancelAnimationFrame(alignmentFrame);sizes.disconnect();previousInert.forEach((value,element)=>{element.inert=value;});root.classList.remove('echo-nav-only-scroll','echo-viewport-moving');
   window.removeEventListener('echo:viewport-navigate',navigate);
   window.removeEventListener('wheel',wheel);
   window.removeEventListener('keydown',key);
   window.removeEventListener('touchstart',touchStart);
   window.removeEventListener('touchmove',touchMove);
   window.removeEventListener('touchend',touchEnd);
   window.removeEventListener('touchcancel',touchEnd);
   window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);motion.removeEventListener('change',motionChange);
  };
 },[resetVersion,seasonalEnabled,contentReady,targetReady]);
}
