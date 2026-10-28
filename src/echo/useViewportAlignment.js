import {useEffect} from 'react';

const CHAPTERS=['home-music-archive','services','live','about-dj-khalil'];

export function useViewportAlignment() {
  useEffect(()=>{
    const chapters=CHAPTERS.map(id=>document.getElementById(id)).filter(Boolean);
    const previous=new Map(chapters.map(element=>[element,element.getBoundingClientRect().top]));
    const motion=window.matchMedia('(prefers-reduced-motion: reduce)');
    let lastY=window.scrollY,pending=null,timer=0,settling=false,release=0;
    const handled=new Set();
    const headerBottom=()=>Math.max(0,document.querySelector('.echo-header')?.getBoundingClientRect().bottom||0);
    const blocked=()=>document.querySelector('dialog[open],#echo-navigation.is-open')||document.querySelector('.event-order-layout.is-reviewing');
    const clearPending=()=>{clearTimeout(timer);pending=null;};
    const finish=()=>{
      settling=false;clearTimeout(release);lastY=window.scrollY;
      chapters.forEach(element=>previous.set(element,element.getBoundingClientRect().top));
    };
    const align=()=>{
      const element=pending;pending=null;
      if(!element||blocked())return;
      const offset=headerBottom(),rect=element.getBoundingClientRect();
      if(rect.top<=offset+4||rect.top>offset+(window.innerHeight-offset)/2)return;
      handled.add(element);
      settling=true;
      window.scrollTo({top:Math.max(0,window.scrollY+rect.top-offset),behavior:motion.matches?'instant':'smooth'});
      release=window.setTimeout(finish,1200);
    };
    const scroll=()=>{
      const y=window.scrollY,down=y>lastY+.5,up=y<lastY-.5;
      lastY=y;
      if(settling)return;
      const offset=headerBottom(),half=offset+(window.innerHeight-offset)/2;
      if(up||blocked())clearPending();
      for(const element of chapters){
        const top=element.getBoundingClientRect().top,was=previous.get(element);
        previous.set(element,top);
        if(top>half+40)handled.delete(element);
        if(down&&!blocked()&&!handled.has(element)&&was>half&&top<=half&&top>offset+4)pending=element;
      }
      // Let the current wheel/touch gesture settle, then complete the alignment.
      if(down&&pending){clearTimeout(timer);timer=window.setTimeout(align,120);}
    };
    const cancel=()=>{
      clearPending();
      if(settling){window.scrollTo({top:window.scrollY,behavior:'instant'});finish();}
    };
    const wheel=event=>{if(event.deltaY<0)cancel();};
    const key=event=>{if(['ArrowUp','PageUp','Home','Escape'].includes(event.key))cancel();};
    const resize=()=>{cancel();chapters.forEach(element=>previous.set(element,element.getBoundingClientRect().top));};
    const scrollEnd=event=>{if(event.target===document||event.target===window)finish();};
    window.addEventListener('scroll',scroll,{passive:true});
    window.addEventListener('scrollend',scrollEnd);
    window.addEventListener('wheel',wheel,{passive:true});
    window.addEventListener('keydown',key);
    window.addEventListener('pointerdown',cancel,{passive:true});
    window.addEventListener('resize',resize);
    return()=>{
      clearTimeout(timer);clearTimeout(release);
      if(settling)window.scrollTo({top:window.scrollY,behavior:'instant'});
      window.removeEventListener('scroll',scroll);
      window.removeEventListener('scrollend',scrollEnd);
      window.removeEventListener('wheel',wheel);
      window.removeEventListener('keydown',key);
      window.removeEventListener('pointerdown',cancel);
      window.removeEventListener('resize',resize);
    };
  },[]);
}
