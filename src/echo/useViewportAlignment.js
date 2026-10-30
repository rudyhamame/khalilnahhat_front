import {useEffect} from 'react';
import {APP_VIEWPORT_TARGETS} from '../lib/bookingViewport';

const CHAPTERS=['khalil-work','availability','home-music-archive','services','live','about-dj-khalil'];
const GESTURE_GAP=240;
const GESTURE_THRESHOLD=42;

export function useViewportAlignment(){
 useEffect(()=>{
  const hero=document.querySelector('.echo-artist-sequence');
  const viewports=[hero,...CHAPTERS.map(id=>document.getElementById(id))].filter(Boolean);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,layoutFrame=0,animating=false,burst=null,touch=null,followingVoice=false;
  const blocked=()=>document.querySelector('dialog[open],#echo-navigation.is-open,.event-order-layout.is-reviewing');
  const offset=()=>Math.max(0,document.querySelector('.echo-header')?.getBoundingClientRect().bottom||0);
  const ownsScroll=target=>{
   for(let node=target;node&&node!==document.body;node=node.parentElement){
    if(node.matches?.('input,textarea,select,[role=slider],[contenteditable=true],[role=dialog],[role=listbox],.event-order-aside'))return true;
    const style=getComputedStyle(node);
    if(!viewports.includes(node)&&/auto|scroll/.test(style.overflowY)&&node.scrollHeight>node.clientHeight+2)return true;
   }
   return false;
  };
  // A container under the pointer keeps the wheel: even at its end it must not hand the gesture to the page.
  const innerScroller=target=>{
   for(let node=target;node&&node!==document.body;node=node.parentElement){
    if(!viewports.includes(node)&&/auto|scroll/.test(getComputedStyle(node).overflowY)&&node.scrollHeight>node.clientHeight+2)return node;
   }
   return null;
  };
  const stop=()=>{cancelAnimationFrame(frame);frame=0;animating=false;};
  const cancel=()=>{stop();cancelAnimationFrame(layoutFrame);layoutFrame=0;burst=null;touch=null;followingVoice=false;};
  const destination=element=>element.bottomOf?Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+element.bottomOf.getBoundingClientRect().bottom-innerHeight)):element===hero?0:Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+element.getBoundingClientRect().top-offset()));
  const animate=element=>{
   stop();
   const start=scrollY,end=destination(element);
   if(Math.abs(end-start)<1)return;
   if(motion.matches){scrollTo({top:end,behavior:'instant'});return;}
   animating=true;
   const began=performance.now(),duration=Math.min(900,Math.max(620,Math.abs(end-start)*.65));
   const tick=now=>{
    if(blocked()){cancel();return;}
    const t=Math.min(1,(now-began)/duration);
    // Quintic easing has zero velocity and acceleration at both ends.
    const eased=t*t*t*(t*(t*6-15)+10);
    scrollTo({top:start+(destination(element)-start)*eased,behavior:'instant'});
    if(t<1)frame=requestAnimationFrame(tick);
    else{scrollTo({top:destination(element),behavior:'instant'});frame=0;animating=false;followingVoice=false;}
   };
   frame=requestAnimationFrame(tick);
  };
  const navigate=event=>{
   const section=event.detail?.section;
   if(blocked()||!Object.hasOwn(APP_VIEWPORT_TARGETS,section))return;
   const element=document.querySelector(APP_VIEWPORT_TARGETS[section]);
   if(!element||!viewports.includes(element))return;
   event.preventDefault();cancel();animate(element);followingVoice=event.detail?.source==='voice'&&animating;
  };
  const targetFor=direction=>{
   const stops=[...viewports];
   if(hero){
    // VP1 has its own landing at the bottom of the composition. Reaching
    // that landing consumes this gesture; only a new gesture enters VP2.
    const bottom=Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+hero.getBoundingClientRect().bottom-innerHeight));
    if(bottom>destination(hero)+8)stops.push({bottomOf:hero});
   }
   stops.sort((a,b)=>destination(a)-destination(b));
   return direction>0?stops.find(stop=>destination(stop)>scrollY+8):stops.reverse().find(stop=>destination(stop)<scrollY-8);
  };
  // On narrow screens a chapter may be taller than a screen. Allow its
  // contents to pass naturally before advancing to the next chapter.
  const withinTallChapter=(direction,delta=0)=>{
   const top=offset(),current=viewports.slice().reverse().find(element=>element.getBoundingClientRect().top<=top+8);
   if(!current||current===hero)return false;
   const rect=current.getBoundingClientRect(),room=innerHeight-top;
   if(rect.height<=room+12)return false;
   return direction>0?rect.bottom>innerHeight+Math.max(8,Math.abs(delta)):rect.top<top-Math.max(8,Math.abs(delta));
  };
  // Capture the chapter before the aside changes page width. Its reflow can
  // change every subsequent chapter's absolute position, including VP1's height.
  const preserveChapter=()=>{
   if(blocked()||animating)return;
   cancel();
   const top=offset();
   const element=viewports.slice().reverse().find(node=>node.getBoundingClientRect().top<=top+8)||hero;
   if(!element)return;
   const rect=element.getBoundingClientRect(),room=innerHeight-top;
   const travel=Math.max(0,rect.height-room);
   const progress=travel>0?Math.max(0,Math.min(1,(top-rect.top)/travel)):0;
   const inset=travel>0?0:rect.top-top;
   const began=performance.now();
   const align=now=>{
    if(blocked()){layoutFrame=0;return;}
    const next=element.getBoundingClientRect(),header=offset();
    const desired=scrollY+next.top-header+(travel>0?progress*Math.max(0,next.height-(innerHeight-header)):-inset);
    scrollTo({top:Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,desired)),behavior:'instant'});
    // Includes the .65s CSS transition and ViewportFit's observer frames.
    if(now-began<950)layoutFrame=requestAnimationFrame(align);
    else layoutFrame=0;
   };
   layoutFrame=requestAnimationFrame(align);
  };
  const wheel=event=>{
   if(followingVoice){cancel();return;}
   if(event.defaultPrevented||blocked()||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
   if(ownsScroll(event.target)){
    const inner=innerScroller(event.target);
    if(inner&&event.cancelable&&(event.deltaY<0?inner.scrollTop<=0:inner.scrollTop+inner.clientHeight>=inner.scrollHeight-1))event.preventDefault();
    return;
   }
   if(layoutFrame)cancel();
   const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?innerHeight:1);
   if(!delta)return;
   const now=performance.now();
   if(!burst||(!animating&&now-burst.time>GESTURE_GAP)){
    const direction=Math.sign(delta);
    if(withinTallChapter(direction,delta))return;
    const target=targetFor(direction);
    if(!target)return;
    // Capture once, before any native movement or inertia can change it.
    burst={time:now,direction,target,amount:0,committed:false};
   }
   burst.time=now;
   if(event.cancelable)event.preventDefault();
   if(burst.committed||animating)return;
   burst.amount=Math.max(0,burst.amount+delta*burst.direction);
   if(burst.amount>=GESTURE_THRESHOLD){burst.committed=true;animate(burst.target);}
  };
  const key=event=>{
   if(followingVoice&&['PageDown','PageUp',' ','Home','End','ArrowUp','ArrowDown','Escape'].includes(event.key))cancel();
   if(event.defaultPrevented||blocked()||ownsScroll(event.target)||event.target.closest?.('button,a[href]')||event.ctrlKey||event.metaKey||event.altKey)return;
   if(layoutFrame&&['PageDown','PageUp',' ','Home','End','ArrowUp','ArrowDown'].includes(event.key))cancel();
   if(['PageDown','PageUp',' '].includes(event.key)){
    if(animating||event.repeat){event.preventDefault();return;}
    const direction=event.key==='PageUp'||event.key===' '&&event.shiftKey?-1:1;
    if(withinTallChapter(direction))return;
    const target=targetFor(direction);
    if(target){event.preventDefault();burst=null;animate(target);}
   }else if(['Escape','Home','End','ArrowUp','ArrowDown'].includes(event.key))cancel();
  };
  const touchStart=event=>{
   if(followingVoice)cancel();
   if(event.touches.length!==1||blocked()||ownsScroll(event.target)){touch=null;return;}
   if(layoutFrame)cancel();
   const point=event.touches[0];
   touch={x:point.clientX,y:point.clientY,committed:false,locked:animating};
  };
  const touchMove=event=>{
   if(event.defaultPrevented||!touch||event.touches.length!==1||blocked()||ownsScroll(event.target))return;
   const point=event.touches[0],delta=touch.y-point.clientY;
   if(Math.abs(point.clientX-touch.x)>Math.abs(delta))return;
   if(touch.locked||touch.committed){if(event.cancelable)event.preventDefault();return;}
   if(withinTallChapter(Math.sign(delta)))return;
   const target=targetFor(Math.sign(delta));
   if(!target)return;
   if(event.cancelable)event.preventDefault();
   if(Math.abs(delta)>=55){touch.committed=true;burst=null;animate(target);}
  };
  const touchEnd=()=>{touch=null;};
  const pointerDown=event=>{if(event.pointerType!=='touch')cancel();};
  const pauseFollow=()=>{if(followingVoice)cancel();};
  window.addEventListener('echo:order-layout-changing',preserveChapter);
  window.addEventListener('echo:viewport-follow-cancel',pauseFollow);
  window.addEventListener('echo:viewport-navigate',navigate);
  window.addEventListener('wheel',wheel,{passive:false});
  window.addEventListener('keydown',key);
  window.addEventListener('pointerdown',pointerDown,{passive:true});
  window.addEventListener('touchstart',touchStart,{passive:true});
  window.addEventListener('touchmove',touchMove,{passive:false});
  window.addEventListener('touchend',touchEnd,{passive:true});
  window.addEventListener('touchcancel',cancel,{passive:true});
  window.addEventListener('resize',cancel);
  return()=>{
   cancel();
   window.removeEventListener('echo:order-layout-changing',preserveChapter);
   window.removeEventListener('echo:viewport-follow-cancel',pauseFollow);
   window.removeEventListener('echo:viewport-navigate',navigate);
   window.removeEventListener('wheel',wheel);
   window.removeEventListener('keydown',key);
   window.removeEventListener('pointerdown',pointerDown);
   window.removeEventListener('touchstart',touchStart);
   window.removeEventListener('touchmove',touchMove);
   window.removeEventListener('touchend',touchEnd);
   window.removeEventListener('touchcancel',cancel);
   window.removeEventListener('resize',cancel);
  };
 },[]);
}
