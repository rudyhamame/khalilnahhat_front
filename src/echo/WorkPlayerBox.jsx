import {useEffect,useState} from 'react';
import MusicPlayerPage from './MusicPlayerPage';

export default function WorkPlayerBox({active,lang,type,onClose,children}){
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  setReady(false);
  if(!active)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setReady(true);return;}
 },[active]);
 return <div className={`work-player-box${active?' is-open':''}`}>
  <div className="work-player-turn" onAnimationEnd={event=>{if(event.animationName==='work-player-turn')setReady(true);}}>
   <div className="work-player-front" inert={active} aria-hidden={active||undefined}>{children}</div>
   {active&&<div className="work-player-back" inert={!ready} aria-hidden={!ready||undefined}>
    <div className="work-player-content"><MusicPlayerPage lang={lang} type={type} onClose={onClose}/></div>
   </div>}
  </div>
 </div>;
}
