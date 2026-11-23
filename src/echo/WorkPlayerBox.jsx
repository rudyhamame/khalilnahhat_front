import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import MusicPlayerPage from './MusicPlayerPage';
import ReelsPlayer from './ReelsPlayer';

export default function WorkPlayerBox({active,lang,type,workType,tone,onClose,children}){
 // A linked audio recording uses the music deck even when its type also hosts live videos.
 const [linkedRecording]=useState(()=>new URLSearchParams(window.location.search).get('recording')||'');
 const reels=type==='LIVE'&&!linkedRecording;
 const media='(max-width:760px), (max-width:1100px) and (orientation:portrait)';
 const [mobile,setMobile]=useState(()=>window.matchMedia(media).matches),dialog=useRef(null);
 useEffect(()=>{const query=window.matchMedia(media),update=()=>setMobile(query.matches);query.addEventListener('change',update);return()=>query.removeEventListener('change',update);},[]);
 useLayoutEffect(()=>{
  if(!active||!mobile||!dialog.current)return;
  const element=dialog.current,viewport=window.visualViewport,opener=document.activeElement;
  const position=()=>{
   element.style.setProperty('--work-visible-height',`${viewport?.height||window.innerHeight}px`);
   element.style.setProperty('--work-visible-width',`${viewport?.width||window.innerWidth}px`);
   element.style.setProperty('--work-visible-top',`${viewport?.offsetTop||0}px`);
   element.style.setProperty('--work-visible-left',`${viewport?.offsetLeft||0}px`);
  };
  position();element.showModal();
  window.addEventListener('resize',position);viewport?.addEventListener('resize',position);viewport?.addEventListener('scroll',position);
  return()=>{window.removeEventListener('resize',position);viewport?.removeEventListener('resize',position);viewport?.removeEventListener('scroll',position);element.close();if(opener?.isConnected)opener.focus({preventScroll:true});};
 },[active,mobile]);
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
 const box=<div className={`work-player-box${reels?' is-reels':''}${active?' is-open':''}${closing?' is-closing':''}`} data-tone={tone} onAnimationEnd={event=>{if(closing&&event.target===event.currentTarget&&['work-player-shrink','work-player-modal-close'].includes(event.animationName))onClose?.();}}>
  <div className="work-player-turn" onAnimationEnd={event=>{if(event.animationName==='work-player-turn')setReady(true);}}>
   <div className="work-player-front" inert={active} aria-hidden={active||undefined}>{children}</div>
   {active&&<div className="work-player-back" inert={!ready} aria-hidden={!ready||undefined}>
    <div className="work-player-content">{reels?<ReelsPlayer lang={lang} workType={workType} onClose={requestClose} closing={closing}/>:<MusicPlayerPage lang={lang} workType={workType} type={type} playbackReady={ready} onClose={requestClose}/>}</div>
   </div>}
  </div>
 </div>;
 return active&&mobile?<dialog ref={dialog} className={`work-player-modal${reels?' is-reels':''}`} aria-label={reels?'Reels player':'Music player'} onCancel={event=>{event.preventDefault();requestClose();}}>{box}</dialog>:box;
}
