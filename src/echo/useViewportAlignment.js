import {useEffect} from 'react';
import {bookingWorkspaceCanScroll} from '../lib/bookingWorkspaceScroll';
import {APP_VIEWPORT_TARGETS} from '../lib/bookingViewport';

const CHAPTERS=['seasonal-tree-viewport','live','echo-ai','availability','khalil-work-archive','services','contact','about-dj-khalil'];
const GESTURE_GAP=240;
const GESTURE_THRESHOLD=42;

export function useViewportAlignment(resetVersion=0,seasonalEnabled=false){
 useEffect(()=>{
  const hero=document.querySelector('.echo-artist-sequence');
  const viewports=[hero,...CHAPTERS.map(id=>document.getElementById(id))].filter(Boolean);
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,layoutFrame=0,animating=false,burst=null,touch=null,followingVoice=false;
  let viewportWidth=window.innerWidth,workspaceWheel=null;
  const blocked=()=>document.querySelector('dialog[open],#echo-navigation.is-open,.event-order-layout.is-reviewing');
  const offset=()=>Math.max(0,document.querySelector('.echo-header')?.getBoundingClientRect().bottom||0);
  const ownsScroll=target=>{
   for(let node=target;node&&node!==document.body;node=node.parentElement){
    if(node.matches?.('input,textarea,select,[role=slider],[contenteditable=true],[role=dialog],[role=listbox],.event-order-aside,.echo-project-chat'))return true;
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
  const cancel=()=>{stop();cancelAnimationFrame(layoutFrame);layoutFrame=0;burst=null;touch=null;workspaceWheel=null;followingVoice=false;};
  const resize=()=>{
   // Safari expands/collapses its browser chrome during a swipe. A height-only
   // resize must not cancel the swipe or its animation halfway through.
   if(window.innerWidth!==viewportWidth){viewportWidth=window.innerWidth;cancel();}
  };
  const destination=element=>element.bottomOf?Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+element.bottomOf.getBoundingClientRect().bottom-innerHeight)):element===hero?0:Math.max(0,Math.min(document.documentElement.scrollHeight-innerHeight,scrollY+element.getBoundingClientRect().top-offset()));
  const animate=element=>{
   stop();
   let start=scrollY,end=destination(element);
   if(Math.abs(end-start)<1)return;
   if(motion.matches){scrollTo({top:end,behavior:'instant'});return;}
   animating=true;
   const began=performance.now(),duration=Math.min(900,Math.max(620,Math.abs(end-start)*.65));
   const tick=now=>{
    if(blocked()){cancel();return;}
    const t=Math.min(1,(now-began)/duration);
    // Quintic easing has zero velocity and acceleration at both ends.
    const eased=t*t*t*(t*(t*6-15)+10);
    // Sidebar reflow can move this chapter while the gesture is animating.
    // Shift both endpoints together so its visible position stays continuous.
    const nextEnd=destination(element);
    start+=nextEnd-end;end=nextEnd;
    scrollTo({top:start+(end-start)*eased,behavior:'instant'});
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
   const visibleHeight=node=>{
    const rect=node.getBoundingClientRect();
    return Math.max(0,Math.min(innerHeight,rect.bottom)-Math.max(top,rect.top));
   };
   // Preserve the chapter occupying the screen, even when its top edge has
   // not reached the header yet. The preceding chapter is then the wrong anchor.
   const element=viewports.reduce((best,node)=>!best||visibleHeight(node)>visibleHeight(best)?node:best,null);
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
  // The first downward gesture belongs to the welcome flow, not navigation.
  // Cancel the chapter transition before opening the modal so VP1 stays put.
  const welcomeGate=(event,direction)=>{
   if(ownsScroll(event.target))return false;
   const welcome=document.querySelector('.hero-audio-introduction[data-welcome-pending=true]');
   if(direction<=0||!welcome)return false;
   const welcomeHero=welcome.closest('.hero-introduction');
   const surface=welcomeHero.closest('.preflight-app-content'),bounds=welcomeHero.getBoundingClientRect();
   if(surface?.getAttribute('aria-hidden')==='true'||bounds.bottom<innerHeight*.65)return false;
   if(event.cancelable)event.preventDefault();cancel();
   window.scrollTo({top:0,behavior:'instant'});
   window.dispatchEvent(new CustomEvent('echo:hero-language-request'));
   return true;
  };
  const wheel=event=>{
   if(followingVoice){cancel();return;}
   if(event.defaultPrevented||blocked()||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY))return;
   if(welcomeGate(event,event.deltaY))return;
   const workspaceCanScroll=bookingWorkspaceCanScroll(event.target,Math.sign(event.deltaY));
   if(workspaceCanScroll!==null){
    const now=performance.now(),direction=Math.sign(event.deltaY);
    if(!workspaceWheel||now-workspaceWheel.time>GESTURE_GAP||workspaceWheel.direction!==direction)workspaceWheel={time:now,direction,inner:workspaceCanScroll};
    workspaceWheel.time=now;
    if(workspaceWheel.inner){
     if(!workspaceCanScroll&&event.cancelable)event.preventDefault();
     return;
    }
   }
   if(workspaceCanScroll===null&&ownsScroll(event.target)){
    const inner=innerScroller(event.target);
    if(event.cancelable&&((!inner&&event.target.closest?.('.echo-project-chat'))||(inner&&(event.deltaY<0?inner.scrollTop<=0:inner.scrollTop+inner.clientHeight>=inner.scrollHeight-1))))event.preventDefault();
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
   if(event.defaultPrevented||blocked()||event.ctrlKey||event.metaKey||event.altKey)return;
   if(!event.target.closest?.('button,a[href],input,textarea,select,[contenteditable=true]')&&(['PageDown','ArrowDown'].includes(event.key)||event.key===' '&&!event.shiftKey)&&welcomeGate(event,1))return;
   const direction=event.key==='PageUp'||event.key===' '&&event.shiftKey||event.key==='ArrowUp'?-1:1;
   const workspaceCanScroll=bookingWorkspaceCanScroll(event.target,direction);
   if(event.target.closest?.('button,a[href],input,textarea,select,[contenteditable=true]')||workspaceCanScroll===true||workspaceCanScroll===null&&ownsScroll(event.target))return;
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
   if(event.touches.length!==1||blocked()||(!event.target.closest?.('#echo-ai')&&ownsScroll(event.target))){touch=null;return;}
   if(layoutFrame)cancel();
   const point=event.touches[0];
   touch={x:point.clientX,y:point.clientY,committed:false,locked:animating};
  };
  const touchMove=event=>{
   if(event.target.closest?.('.echo-project-chat')){
    if(!innerScroller(event.target)&&event.cancelable)event.preventDefault();
    return;
   }
   if(event.defaultPrevented||!touch||event.touches.length!==1||blocked()||(!event.target.closest?.('#echo-ai')&&ownsScroll(event.target)))return;
   const point=event.touches[0],delta=touch.y-point.clientY;
   if(!delta||Math.abs(point.clientX-touch.x)>Math.abs(delta))return;
   const workspaceCanScroll=bookingWorkspaceCanScroll(event.target,Math.sign(delta));
   if(workspaceCanScroll!==null){
    touch.inner??=workspaceCanScroll;
    if(touch.inner)return;
   }
   if(delta>8&&welcomeGate(event,delta))return;
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
  window.addEventListener('resize',resize);
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
   window.removeEventListener('resize',resize);
  };
 },[resetVersion,seasonalEnabled]);
}
