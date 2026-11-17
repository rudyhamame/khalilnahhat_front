import {djWorkTypeText} from '../lib/djWorkTypeText';
import {useEffect,useRef,useState} from 'react';
import {readArchivePlayerState,subscribeArchivePlayerState} from '../lib/archivePlayerBridge';
import {ArrowDown,ArrowUp} from 'lucide-react';
import './workTypeJourney.css';

// Music page journey, rebuilt from scratch on plain native scrolling: a column of sections (the overview, then one
// full-height story per sound). There is no scroll manager at all: no wheel/touch/key handling, no scripted
// scroll animation and no snapping, so nothing can fight the scroll position or flicker. JS only reveals each
// story once and plays the card→player entry. A taller-than-screen section simply scrolls.
export default function WorkTypeJourney({ar,workTypes,renderCard:renderWorkCard,intro,onOpenWork,activeType}){
 const root=useRef(null);
 const reduced=()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches;
 const backToTop=()=>window.scrollTo({top:0,behavior:reduced()?'auto':'smooth'});
 // While a track plays in a box, that box's screen turns into a moving blend of the box's rim colours.
 const [playing,setPlaying]=useState(()=>Boolean(readArchivePlayerState().playing));
 useEffect(()=>subscribeArchivePlayerState(event=>setPlaying(Boolean(event.detail?.playing))),[]);
 // A card in the overview scrolls down to its own sound's screen and opens the player there; a card in a story opens in place.
 const goToStory=work=>{
  const target=root.current?.querySelector(`.work-story[data-work="${work.id}"]`);
  if(!target){onOpenWork?.(work.id);return;}
  const open=()=>onOpenWork?.(work.id);
  if(reduced()){target.scrollIntoView({block:'start'});open();return;}
  target.scrollIntoView({behavior:'smooth',block:'start'});
  const done=()=>{window.removeEventListener('scrollend',done);clearTimeout(timer);open();};
  const timer=setTimeout(done,1200);window.addEventListener('scrollend',done,{once:true});
 };
 const renderCard=(work,index,story=false)=>renderWorkCard(work,index,{compact:!story,active:story&&activeType===work.id,onOpen:story?()=>onOpenWork?.(work.id):()=>goToStory(work)});

 // A player that is open owns the screen: its section is aligned fully into view and the page cannot scroll until the player is closed (back).
 useEffect(()=>{
  if(!activeType)return undefined;
  const target=root.current?.querySelector(`.work-story[data-work="${activeType}"]`);
  target?.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});
  const html=document.documentElement;html.classList.add('echo-work-locked');
  return()=>html.classList.remove('echo-work-locked');
 },[activeType]);

 // Reveal each story once. One-way (never toggled back off), so scrolling up and down cannot flicker it.
 useEffect(()=>{
  const element=root.current;if(!element)return undefined;
  const reveal=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(!entry.isIntersecting)return;
   entry.target.dataset.visible='1';reveal.unobserve(entry.target);
  }),{threshold:.2});
  element.querySelectorAll('.work-story').forEach(node=>reveal.observe(node));
  return()=>reveal.disconnect();
 },[workTypes]);

 return <div className="work-type-journey" ref={root}>
  <section className="home-work-showcase work-journey-overview" aria-label={ar?'أعمال دي جي خليل':'DJ Khalil’s work'}>
   <div className="work-overview-intro">
    <div className="work-overview-portrait" aria-hidden="true"><img src="/echo/music-hero-khalil.webp" alt="" width="1162" height="1014" fetchPriority="high"/><img className="work-overview-groove" src="/echo/music-hero-khalil.webp" alt="" width="1162" height="1014" decoding="async"/></div>
   </div>
   <div className="work-overview-collections">
    {intro}
    <div className="work-overview-card-area"><div className="glow-cards work-overview-slots">{workTypes.map((work,index)=><div className="work-overview-slot" key={work.id}><div className="work-card-mover">{renderCard(work,index)}</div></div>)}</div></div>
   </div>
   <a className="work-journey-scroll" href="#work-story-first" onClick={event=>{event.preventDefault();document.getElementById('work-story-first')?.scrollIntoView({behavior:reduced()?'auto':'smooth',block:'start'});}}><span>{ar?'انزل لتكتشف كل نوع':'Scroll to discover each sound'}</span><ArrowDown size={18}/></a>
  </section>
  <div className="work-stories">{workTypes.map((work,index)=>{
   const {name,details}=djWorkTypeText(work,ar);
   return <section key={work.id} data-work={work.id} data-tone={index%6} id={index===0?'work-story-first':`work-story-${work.id.toLowerCase()}`} className={`work-story${index%2?' is-card-right':''}${playing&&activeType===work.id?' is-playing':''}`} aria-labelledby={`work-story-title-${work.id}`}>
    <div className="work-story-card-slot"><div className="work-story-card">{renderCard(work,index,true)}</div></div>
    <div className="work-story-copy" id={`work-story-copy-${work.id}`}><div className="work-story-copy-inner">
     <span className="work-story-number">{String(index+1).padStart(2,'0')} / {name}</span>
     <h3 id={`work-story-title-${work.id}`}>{name}</h3>
     {details&&<p id={`work-story-description-${work.id}`}>{details}</p>}
     <button type="button" className="work-story-listen" onClick={backToTop}>{ar?'العودة إلى الأعلى':'Back to top'}<ArrowUp size={18}/></button>
    </div></div>
   </section>;
  })}</div>
 </div>;
}
