import {useEffect} from 'react';

const CHAPTERS=['khalil-work','home-music-archive','services','live','about-dj-khalil'];

export function useViewportAlignment() {
  useEffect(()=>{
    const chapters=CHAPTERS.map(id=>document.getElementById(id)).filter(Boolean);
    const hero=document.querySelector('.echo-artist-sequence');
    const viewports=[hero,...chapters].filter(Boolean);
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const handled=new Set();
    let lastY=window.scrollY,frame=0,settling=false,touchY=null,gestureDirection=0,gestureAmount=0,gestureTime=0,gestureLocked=false,touchOrigin=null,touchBegan=0;
    const headerBottom=()=>Math.max(0,document.querySelector('.echo-header')?.getBoundingClientRect().bottom||0);
    const blocked=()=>document.querySelector('dialog[open],#echo-navigation.is-open,.event-order-layout.is-reviewing');
    const ownsScroll=target=>{
      for(let node=target;node&&node!==document.body;node=node.parentElement){
        if(node.matches?.('input,textarea,select,button,a[href],[role=slider],[contenteditable=true],[role=dialog],[role=listbox],.event-order-aside'))return true;
        const style=getComputedStyle(node);
        if(!viewports.includes(node)&&/auto|scroll/.test(style.overflowY)&&node.scrollHeight>node.clientHeight+2)return true;
      }
      return false;
    };
    const cancel=()=>{cancelAnimationFrame(frame);frame=0;settling=false;lastY=window.scrollY;};
    const align=element=>{
      const start=window.scrollY,offset=headerBottom();
      const end=element===hero?0:Math.max(0,Math.min(document.documentElement.scrollHeight-window.innerHeight,start+element.getBoundingClientRect().top-offset));
      handled.add(element);
      if(Math.abs(end-start)<2)return;
      if(motion.matches){window.scrollTo({top:end,behavior:'instant'});lastY=window.scrollY;return;}
      settling=true;
      const began=performance.now(),duration=Math.min(620,Math.max(340,Math.abs(end-start)*.9));
      const tick=now=>{
        if(blocked()){cancel();return;}
        const progress=Math.min(1,(now-began)/duration),ease=1-Math.pow(1-progress,3);
        window.scrollTo({top:start+(end-start)*ease,behavior:'instant'});
        lastY=window.scrollY;
        if(progress<1)frame=requestAnimationFrame(tick);else{frame=0;settling=false;}
      };
      frame=requestAnimationFrame(tick);
    };
    const scroll=()=>{
      const y=window.scrollY,down=y>lastY+.5;lastY=y;
      if(settling||blocked())return;
      const offset=headerBottom(),half=offset+(window.innerHeight-offset)/2;
      for(const element of chapters){
        const top=element.getBoundingClientRect().top;
        if(top>half+40)handled.delete(element);
        // Pull the incoming chapter into place immediately as it reaches halfway.
        // Once aligned, it remains free to scroll away on the next gesture.
        if(down&&!handled.has(element)&&top<=half&&top>offset+4){align(element);break;}
      }
    };
    const advance=direction=>{
      const offset=headerBottom();
      const target=direction>0?viewports.find(element=>element.getBoundingClientRect().top>offset+8):viewports.slice().reverse().find(element=>element.getBoundingClientRect().top<offset-8);
      if(!target)return false;
      cancel();align(target);return true;
    };
    const wheel=event=>{
      if(event.defaultPrevented||blocked()||event.ctrlKey||Math.abs(event.deltaX)>Math.abs(event.deltaY)||ownsScroll(event.target))return;
      const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?window.innerHeight:1);
      if(!delta)return;
      const now=performance.now(),direction=Math.sign(delta);
      if(now-gestureTime>220||direction!==gestureDirection){gestureAmount=0;gestureLocked=false;}
      gestureTime=now;gestureDirection=direction;gestureAmount+=Math.abs(delta);
      // Consume the rest of the same wheel/trackpad burst, including inertia.
      if(gestureLocked){if(event.cancelable)event.preventDefault();return;}
      if(Math.abs(delta)>=70||gestureAmount>=130){
        gestureLocked=advance(direction);
        if(gestureLocked&&event.cancelable)event.preventDefault();
        return;
      }
      if(delta<0)cancel();else if(settling&&event.cancelable)event.preventDefault();
    };
    const key=event=>{
      if(blocked()||ownsScroll(event.target)||event.ctrlKey||event.metaKey||event.altKey)return;
      if(['PageDown','PageUp',' '].includes(event.key)){
        if(event.repeat){if(event.cancelable)event.preventDefault();return;}
        if(advance(event.key==='PageUp'||event.key===' '&&event.shiftKey?-1:1))event.preventDefault();
      }else if(['ArrowUp','Home','End','Escape'].includes(event.key))cancel();
      else if(settling&&event.key==='ArrowDown')event.preventDefault();
    };
    const touchStart=event=>{cancel();touchY=event.touches.length===1?event.touches[0].clientY:null;touchOrigin=touchY;touchBegan=performance.now();gestureLocked=false;};
    const touchMove=event=>{
      if(touchY===null||event.touches.length!==1||blocked()||ownsScroll(event.target))return;
      const y=event.touches[0].clientY,delta=touchY-y;touchY=y;
      if(gestureLocked){if(event.cancelable)event.preventDefault();return;}
      const distance=touchOrigin-y;
      if(performance.now()-touchBegan<450&&Math.abs(distance)>Math.max(60,window.innerHeight*.12)){
        gestureLocked=advance(Math.sign(distance));
        if(gestureLocked&&event.cancelable)event.preventDefault();
      }else if(delta< -2)cancel();else if(settling&&delta>0&&event.cancelable)event.preventDefault();
    };
    window.addEventListener('scroll',scroll,{passive:true});
    window.addEventListener('wheel',wheel,{passive:false});
    window.addEventListener('keydown',key);
    window.addEventListener('pointerdown',cancel,{passive:true});
    window.addEventListener('touchstart',touchStart,{passive:true});
    window.addEventListener('touchmove',touchMove,{passive:false});
    window.addEventListener('resize',cancel);
    return()=>{
      cancel();
      window.removeEventListener('scroll',scroll);
      window.removeEventListener('wheel',wheel);
      window.removeEventListener('keydown',key);
      window.removeEventListener('pointerdown',cancel);
      window.removeEventListener('touchstart',touchStart);
      window.removeEventListener('touchmove',touchMove);
      window.removeEventListener('resize',cancel);
    };
  },[]);
}
