import {useLayoutEffect} from 'react';

// Tint browser controls and the page canvas together: translucent browser bars
// can sample the canvas rather than using the theme-color hint.
export function useBrowserChromeTheme(path,contentReady){
 useLayoutEffect(()=>{
  if(path!=='/')return;
  const shell=document.querySelector('.echo[data-page=home]');if(!shell)return;
  const existing=document.querySelector('meta[name="theme-color"]');
  const meta=existing||document.createElement('meta');
  const previousContent=meta.getAttribute('content');
  if(!existing){meta.name='theme-color';document.head.appendChild(meta);}
  const surfaces=[document.documentElement,document.body];
  const previous=surfaces.map(element=>[element.style.getPropertyValue('background-color'),element.style.getPropertyPriority('background-color')]);
  let frame=0,lastColor='';
  const update=()=>{
   frame=0;
   const hero=shell.querySelector('.hero-introduction');
   const green=getComputedStyle(shell).getPropertyValue('--echo-home-background').trim()||'#15231b';
   const about=shell.querySelector('#about-dj-khalil')?.getBoundingClientRect();
   const dark=!hero||hero.getBoundingClientRect().bottom>window.innerHeight/2||Boolean(about&&about.top<=window.innerHeight/2&&about.bottom>window.innerHeight/2);
   const color=dark?'#0d1418':green;
   if(color===lastColor)return;lastColor=color;
   meta.content=color;
   surfaces.forEach(element=>element.style.setProperty('background-color',color,'important'));
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();
  window.addEventListener('scroll',schedule,{passive:true});window.addEventListener('resize',schedule);
  window.addEventListener('echo:viewport-transition',schedule);
  return()=>{
   cancelAnimationFrame(frame);
   window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);window.removeEventListener('echo:viewport-transition',schedule);
   if(existing){if(previousContent===null)meta.removeAttribute('content');else meta.content=previousContent;}else meta.remove();
   surfaces.forEach((element,index)=>{const [value,priority]=previous[index];if(value)element.style.setProperty('background-color',value,priority);else element.style.removeProperty('background-color');});
  };
 },[path,contentReady]);
}
