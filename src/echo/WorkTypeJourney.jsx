import {djWorkTypeText} from '../lib/djWorkTypeText';
import {useEffect,useRef,useState} from 'react';
import {readArchivePlayerState,subscribeArchivePlayerState} from '../lib/archivePlayerBridge';
import {ArrowDown,ArrowUp} from 'lucide-react';
import './workTypeJourney.css';

// Music page journey, rebuilt from scratch on plain native scrolling: a column of sections (the overview, then one
// full-height story per sound). There is no scroll manager at all: no wheel/touch/key handling, no scripted
// scroll animation and no snapping, so nothing can fight the scroll position or flicker. JS only reveals each
// story once and plays the card→player entry. A taller-than-screen section simply scrolls.
// Phone and tablet portrait: the overview's 6 boxes are not mounted.
const PHONE_PORTRAIT='(max-width:1100px) and (orientation:portrait)';
function usePhonePortrait(){
 const [match,setMatch]=useState(()=>window.matchMedia(PHONE_PORTRAIT).matches);
 useEffect(()=>{const query=window.matchMedia(PHONE_PORTRAIT),change=()=>setMatch(query.matches);query.addEventListener('change',change);return()=>query.removeEventListener('change',change);},[]);
 return match;
}
export default function WorkTypeJourney({ar,workTypes,renderCard:renderWorkCard,intro,onOpenWork,activeType}){
 const root=useRef(null),phonePortrait=usePhonePortrait();
 // While a track plays in a box, that box's screen turns into a moving blend of the box's rim colours.
 const [playing,setPlaying]=useState(()=>Boolean(readArchivePlayerState().playing));
 useEffect(()=>subscribeArchivePlayerState(event=>setPlaying(Boolean(event.detail?.playing))),[]);
 // A card in the overview opens its sound's player; the page itself scrolls natively.
 const goToStory=work=>onOpenWork?.(work.id);
 const renderCard=(work,index,story=false)=>renderWorkCard(work,index,{compact:!story,active:story&&activeType===work.id,onOpen:story?()=>onOpenWork?.(work.id):()=>goToStory(work)});

 // Opening a box centres its player in the middle of the screen (the page's own smooth scrolling does the movement). The slot grows while it opens, so it is centred again once it has its final size.
 useEffect(()=>{
  if(!activeType)return undefined;
  const slot=()=>root.current?.querySelector(`.work-story[data-work="${activeType}"] .work-story-card-slot`);
  const centre=()=>slot()?.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'center',inline:'nearest'});
  centre();const later=setTimeout(centre,550);
  return()=>clearTimeout(later);
 },[activeType]);

 return <div className="work-type-journey" id="work-journey-top" ref={root}>
  <section className="home-work-showcase work-journey-overview" aria-label={ar?'أعمال دي جي خليل':'DJ Khalil’s work'}>
   <div className="work-overview-intro">
    <div className="work-overview-portrait" aria-hidden="true"><img src="/echo/music-hero-khalil.webp" alt="" width="1162" height="1014" fetchPriority="high"/><img className="work-overview-groove" src="/echo/music-hero-khalil.webp" alt="" width="1162" height="1014" decoding="async"/></div>
   </div>
   <div className="work-overview-collections">
    {intro}
    {!phonePortrait&&<div className="work-overview-card-area"><div className="glow-cards work-overview-slots">{workTypes.map((work,index)=><div className="work-overview-slot" key={work.id}><div className="work-card-mover">{renderCard(work,index)}</div></div>)}</div></div>}
   </div>
   <a className="work-journey-scroll" href="#work-story-first" aria-label={ar?'انزل لتكتشف كل نوع':'Scroll to discover each sound'}><ArrowDown size={22}/></a>
  </section>
  <div className="work-stories">{workTypes.map((work,index)=>{
   const {name,details}=djWorkTypeText(work,ar);
   return <section key={work.id} data-work={work.id} data-tone={index%6} id={index===0?'work-story-first':`work-story-${work.id.toLowerCase()}`} className={`work-story${index%2?' is-card-right':''}${playing&&activeType===work.id?' is-playing':''}`} aria-labelledby={`work-story-title-${work.id}`}>
    <div className="work-story-card-slot"><div className="work-story-card">{renderCard(work,index,true)}</div></div>
    <a className="work-story-listen is-under-box" href="#work-journey-top">{ar?'العودة إلى الأعلى':'Back to top'}<ArrowUp size={18}/></a>
    <div className="work-story-copy" id={`work-story-copy-${work.id}`}><div className="work-story-copy-inner">
     <span className="work-story-number">{String(index+1).padStart(2,'0')} / {name}</span>
     <h3 id={`work-story-title-${work.id}`}>{name}</h3>
     {details&&<p id={`work-story-description-${work.id}`}>{details}</p>}
     <a className="work-story-listen" href="#work-journey-top">{ar?'العودة إلى الأعلى':'Back to top'}<ArrowUp size={18}/></a>
    </div></div>
   </section>;
  })}</div>
 </div>;
}
