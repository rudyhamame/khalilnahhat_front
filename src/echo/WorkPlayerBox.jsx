import {useEffect,useState} from 'react';
import MusicPlayerPage from './MusicPlayerPage';
import ReelsPlayer from './ReelsPlayer';

export default function WorkPlayerBox({active,lang,type,workType,tone,onClose,children}){
 // A linked audio recording uses the music deck even when its type also hosts live videos.
 const [linkedRecording]=useState(()=>new URLSearchParams(window.location.search).get('recording')||'');
 const reels=type==='LIVE'&&!linkedRecording;
 const [ready,setReady]=useState(false),[closing,setClosing]=useState(false);
 // Back plays the opening in reverse (content fades, the box turns back, shrinks to the card) and only then closes.
 const requestClose=()=>{if(closing)return;if(window.matchMedia('(prefers-reduced-motion: reduce)').matches)onClose?.();else setClosing(true);};
 useEffect(()=>{if(!active)setClosing(false);},[active]);
 useEffect(()=>{
  setReady(false);
  if(!active)return;
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){setReady(true);return;}
  // The turn animation normally unlocks the player; if it never reports its end (tab in the background, interrupted by a page change) unlock anyway so Back always works.
  const unlock=setTimeout(()=>setReady(true),2200);
  return()=>clearTimeout(unlock);
 },[active]);
 return <div className={`work-player-box${reels?' is-reels':''}${active?' is-open':''}${closing?' is-closing':''}`} data-tone={tone} onAnimationEnd={event=>{if(closing&&event.target===event.currentTarget&&event.animationName==='work-player-shrink')onClose?.();}}>
  <div className="work-player-turn" onAnimationEnd={event=>{if(event.animationName==='work-player-turn')setReady(true);}}>
   <div className="work-player-front" inert={active} aria-hidden={active||undefined}>{children}</div>
   {active&&<div className="work-player-back" inert={!ready} aria-hidden={!ready||undefined}>
    <div className="work-player-content">{reels?<ReelsPlayer lang={lang} workType={workType} onClose={requestClose} closing={closing}/>:<MusicPlayerPage lang={lang} workType={workType} type={type} playbackReady={ready} onClose={requestClose}/>}</div>
   </div>}
  </div>
 </div>;
}
