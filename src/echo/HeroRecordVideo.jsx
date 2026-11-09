import {useEffect,useRef,useState} from 'react';
import './heroRecordVideo.css';
export default function HeroRecordVideo({playing=false,language=null}){
 const direction=language==='ar'?'ccw':'cw';
 const video=useRef(null),[failed,setFailed]=useState(false),[visible,setVisible]=useState(true);
 useEffect(()=>{const element=video.current;if(!element)return;const observer=new IntersectionObserver(entries=>setVisible(entries[0].isIntersecting));observer.observe(element);return()=>observer.disconnect();},[language]);
 useEffect(()=>{
  const element=video.current;if(!element)return;let current=true;
  if(playing&&visible&&!document.hidden)void element.play().catch(()=>{if(current)setFailed(true);});else element.pause();
  const hidden=()=>{if(document.hidden)element.pause();else if(playing&&visible)void element.play().catch(()=>{});};document.addEventListener('visibilitychange',hidden);
  return()=>{current=false;element.pause();document.removeEventListener('visibilitychange',hidden);};
 },[playing,visible,language]);
 useEffect(()=>{setFailed(false);if(video.current)video.current.currentTime=0;},[language]);
 return <div className="hero-record-video" aria-hidden="true" data-playing={playing} data-direction={direction}>
  <video key={direction} ref={video} muted playsInline loop preload="auto" poster="/echo/hero-record-video/poster.webp" onError={()=>setFailed(true)}>
   <source src={`/echo/hero-record-video/record-${direction}-alpha.webm`} type="video/webm"/>
   <source src={`/echo/hero-record-video/record-${direction}.mp4`} type="video/mp4"/>
  </video>
  {failed&&<img src="/echo/hero-record-video/poster.webp" alt=""/>}
 </div>;
}
