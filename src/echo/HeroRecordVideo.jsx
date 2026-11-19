import {useEffect,useRef,useState} from 'react';
import './heroRecordVideo.css';
export default function HeroRecordVideo({playing=false,language=null,onReady}){
 const direction=language==='ar'?'ccw':'cw';
 const video=useRef(null),[failed,setFailed]=useState(false),[loaded,setLoaded]=useState(false),[visible,setVisible]=useState(true);

 // Title room: the space between the title's edge and the record's edge (CSS px), so the title wraps exactly where it meets the record.
 useEffect(()=>{
  const record=video.current?.parentElement,root=record?.closest('.hero-introduction');if(!root)return;
  const measure=()=>{
   const title=root.querySelector('.echo-hero-title');if(!title||!record.offsetWidth)return;
   const r=record.getBoundingClientRect(),t=title.getBoundingClientRect(),k=r.width/record.offsetWidth||1,rtl=getComputedStyle(root).direction==='rtl';
   const room=((rtl?t.right-r.right:r.left-t.left)/k)-20;
   if(room>120)root.style.setProperty('--title-room',`${Math.floor(room)}px`);
  };
  measure();const observer=new ResizeObserver(measure);observer.observe(root);observer.observe(record);
  addEventListener('resize',measure);root.addEventListener('animationend',measure);const timer=setTimeout(measure,1200);
  return()=>{observer.disconnect();removeEventListener('resize',measure);root.removeEventListener('animationend',measure);clearTimeout(timer);};
 },[language]);
 useEffect(()=>{onReady?.(loaded||failed);},[loaded,failed,onReady]);
 useEffect(()=>{const element=video.current;if(!element)return;const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting));observer.observe(element);return()=>observer.disconnect();},[language]);
 useEffect(()=>{
  const element=video.current;if(!element)return;let current=true;
  if(playing&&visible&&!document.hidden)void element.play().catch(()=>{if(current)setFailed(true);});else element.pause();
  const hidden=()=>{if(document.hidden)element.pause();else if(playing&&visible)void element.play().catch(()=>{});};document.addEventListener('visibilitychange',hidden);
  return()=>{current=false;element.pause();document.removeEventListener('visibilitychange',hidden);};
 },[playing,visible,language]);
 useEffect(()=>{setFailed(false);setLoaded(false);if(video.current)video.current.currentTime=0;},[language]);
 return <div className="hero-record-video" aria-hidden="true" data-loaded={loaded||failed} data-playing={playing} data-direction={direction}>
  <video key={direction} ref={video} muted playsInline loop preload="auto" poster="/echo/hero-record-video/poster.webp" onLoadedData={()=>setLoaded(true)} onError={()=>setFailed(true)}>
   <source src={`/echo/hero-record-video/record-${direction}-alpha.webm`} type="video/webm"/>
   <source src={`/echo/hero-record-video/record-${direction}.mp4`} type="video/mp4"/>
  </video>
  {failed&&<img src="/echo/hero-record-video/poster.webp" alt=""/>}
 </div>;
}
