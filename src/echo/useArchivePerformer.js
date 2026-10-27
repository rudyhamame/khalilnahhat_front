import {useEffect} from 'react';
import './archivePerformer.css';

// Stage the animated portrait in VP3 while the static hero copy stays in VP1.
export default function useArchivePerformer(){
  useEffect(()=>{
    let active=false,frame=0,animation,revision=0;
    const section=document.querySelector('#home-music-archive');
    const hero=document.querySelector('.echo-artist-sequence');
    const portrait=hero?.querySelector('.echo-continuous-artist:not(.echo-hero-static-artist)');
    if(!section||!hero||!portrait)return;
    const motion=matchMedia('(prefers-reduced-motion: reduce)');
    const position=()=>{
      frame=0;if(!active)return;
      const stage=section.querySelector('.home-archive-coverflow')?.getBoundingClientRect();
      const record=section.querySelector('.home-archive-sleeve.is-current')?.getBoundingClientRect();
      if(!stage||!record||!stage.height)return;
      const origin=hero.getBoundingClientRect();
      const width=Math.max(1,Math.min(stage.width*.68,stage.height*.58,520));
      const mixerBottom=parseFloat(getComputedStyle(portrait).getPropertyValue('--mixer-bottom'))||.936;
      portrait.style.setProperty('--archive-performer-width',`${width}px`);
      portrait.style.setProperty('--archive-performer-left',`${record.left+record.width/2-width/2-origin.left}px`);
      portrait.style.setProperty('--archive-performer-top',`${record.top+record.height*.42-width*1.5*mixerBottom-origin.top}px`);
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(position);};
    const restore=()=>{
      ++revision;
      active=false;animation?.cancel();
      delete section.dataset.performerStage;
      delete portrait.dataset.archiveStage;
      for(const property of ['width','left','top'])portrait.style.removeProperty(`--archive-performer-${property}`);
    };
    const enter=()=>{
      section.scrollIntoView({block:'start',behavior:motion.matches?'instant':'smooth'});
      if(active){schedule();return;}
      ++revision;
      for(const item of portrait.getAnimations())item.cancel();
      active=true;section.dataset.performerStage='true';portrait.dataset.archiveStage='true';
      position();
      if(!motion.matches)animation=portrait.animate([{opacity:0},{opacity:1}],{
        delay:1350,duration:450,fill:'both',easing:'ease-out',
      });
    };
    const leave=()=>{
      if(!active)return;
      const pending=++revision;
      animation?.cancel();
      const finish=()=>{
        if(pending!==revision)return;
        restore();
        window.dispatchEvent(new CustomEvent('echo:archive-restored'));
      };
      if(motion.matches){finish();return;}
      animation=portrait.animate([{opacity:1},{opacity:0}],{duration:450,fill:'forwards',easing:'ease-in'});
      animation.finished.then(finish).catch(()=>{});
    };
    const stage=event=>event.detail?.active===false?restore():enter();
    // Enter before the headphones sequence; return to static VP1 only after
    // the reverse sequence has finished in the archive.
    const prepare=()=>enter();
    const observer=new ResizeObserver(schedule);
    const flow=section.querySelector('.home-archive-coverflow');
    if(flow)observer.observe(flow);
    observer.observe(hero);
    const poses=new MutationObserver(schedule);
    poses.observe(portrait,{attributes:true,attributeFilter:['data-performance-pose','class']});
    window.addEventListener('echo:archive-stage',stage);
    window.addEventListener('echo:performer-prepare',prepare);
    window.addEventListener('echo:performer-rested',leave);
    window.addEventListener('resize',schedule);
    return()=>{restore();cancelAnimationFrame(frame);observer.disconnect();poses.disconnect();window.removeEventListener('echo:archive-stage',stage);window.removeEventListener('echo:performer-prepare',prepare);window.removeEventListener('echo:performer-rested',leave);window.removeEventListener('resize',schedule);};
  },[]);
}
