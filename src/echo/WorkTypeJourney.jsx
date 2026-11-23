import {musicBoxScrollTarget} from '../lib/musicBoxPosition';
import {djWorkTypeText} from '../lib/djWorkTypeText';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {readArchivePlayerState,subscribeArchivePlayerState} from '../lib/archivePlayerBridge';
import {ArrowDown,ArrowUp} from 'lucide-react';
import './workTypeJourney.css';

// Music page journey, rebuilt from scratch on plain native scrolling: a column of sections (the overview, then one
// full-height story per sound). There is no scroll manager at all: no wheel/touch/key handling, no scripted
// scroll animation and no snapping, so nothing can fight the scroll position or flicker. JS only reveals each
// story once and plays the card→player entry. A taller-than-screen section simply scrolls.
export default function WorkTypeJourney({ar,workTypes,renderCard:renderWorkCard,intro,onOpenWork,activeType}){
 const root=useRef(null);
 // While a track plays in a box, that box's screen turns into a moving blend of the box's rim colours.
 const [playing,setPlaying]=useState(()=>Boolean(readArchivePlayerState().playing));
 const [reelPlaying,setReelPlaying]=useState(false);
 useEffect(()=>subscribeArchivePlayerState(event=>setPlaying(Boolean(event.detail?.playing))),[]);
 // A Reel video that is playing lights its box's screen the same way a playing recording does.
 useEffect(()=>{const on=event=>setReelPlaying(Boolean(event.detail?.playing));window.addEventListener('echo:reel-playing',on);return()=>window.removeEventListener('echo:reel-playing',on);},[]);
 // Each of the six story boxes enters only when its own viewport reaches the reader. The class is installed
 // before paint so off-screen boxes never flash in their resting position first.
 const entered=useRef(new Set());
 useLayoutEffect(()=>{
  const node=root.current;
  if(!node||window.matchMedia('(prefers-reduced-motion: reduce)').matches||!('IntersectionObserver' in window))return undefined;
  const stories=[...node.querySelectorAll('.work-story')];
  node.classList.add('is-box-reveal-ready');
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(!entry.isIntersecting)return;
   entered.current.add(entry.target.dataset.work);// remembered, so a re-render (e.g. playback starting) does not drop the class and hide the box again
   entry.target.classList.add('is-box-entered');
   observer.unobserve(entry.target);
  }),{threshold:.18,rootMargin:'-8% 0px -8%'});
  stories.forEach(story=>observer.observe(story));
  return()=>{observer.disconnect();node.classList.remove('is-box-reveal-ready');};
 },[workTypes]);
 // Each sound keeps its player in its own story below the overview.
 const renderCard=(work,index)=>renderWorkCard(work,index,{compact:false,active:activeType===work.id,onOpen:()=>{openY.current=window.scrollY;onOpenWork?.(work.id);}});

 // Opening a box locks the page's scrolling, which resets it to the top for a moment: put it back before the first paint so the page does not jump up and scroll down again.
 const openY=useRef(0);
 useLayoutEffect(()=>{if(!activeType||!openY.current)return;const y=openY.current;openY.current=0;window.scrollTo({top:y,behavior:'instant'});document.body.scrollTop=y;},[activeType]);
 // Closing a box shrinks its full-screen section, which would drop the page back up to the top: keep the section's card where the box was.
 const lastActive=useRef('');
 useLayoutEffect(()=>{
  const before=lastActive.current;lastActive.current=activeType;
  if(activeType||!before)return;
  const target=root.current?.querySelector(`.work-story[data-work="${before}"]`);
  if(target)target.scrollIntoView({behavior:'instant',block:'start'});
 },[activeType]);
 // Center the opened box, rather than the story's text and padding above it.
 useEffect(()=>{
  if(!activeType)return undefined;
  const story=()=>[...(root.current?.querySelectorAll('.work-story')||[])].find(node=>node.dataset.work===activeType);
  const centre=(smooth=false)=>{
   const target=story();if(!target)return false;
   const phone=window.matchMedia('(max-width:1100px) and (orientation:portrait)').matches;
   const box=target.querySelector('.work-player-box.is-open');
   if(phone&&box){
    const viewport=window.visualViewport;
    if(viewport&&Math.abs(viewport.scale-1)>.01)return true;
    const header=document.querySelector('.echo-header')?.getBoundingClientRect();
    const top=musicBoxScrollTarget({box:box.getBoundingClientRect(),scrollY:window.scrollY,viewportTop:viewport?.offsetTop||0,viewportHeight:viewport?.height||window.innerHeight,headerBottom:header?.bottom||0});
    if(Math.abs(top-window.scrollY)>.5)window.scrollTo({top,behavior:smooth&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant'});
   }else target.scrollIntoView({behavior:smooth&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches?'smooth':'instant',block:'start',inline:'nearest'});
   return true;
  };
  // The card and its story grow during opening. Align again once their geometry settles.
  let settled=0,resizeTimer=0,tries=0;
  const opening=()=>{if(!centre(true))return false;settled=setTimeout(()=>centre(),850);return true;};
  const poll=setInterval(()=>{if(opening()||++tries>40)clearInterval(poll);},200);
  if(opening())clearInterval(poll);
  const resize=()=>{
   if(document.activeElement?.matches('input,textarea,select,[contenteditable]'))return;
   clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>centre(),120);
  };
  const observer=new ResizeObserver(resize);const target=story()?.querySelector('.work-story-card-slot');if(target)observer.observe(target);
  window.addEventListener('resize',resize);window.visualViewport?.addEventListener('resize',resize);
  return()=>{clearInterval(poll);clearTimeout(settled);clearTimeout(resizeTimer);observer.disconnect();window.removeEventListener('resize',resize);window.visualViewport?.removeEventListener('resize',resize);};
 },[activeType]);

 return <div className="work-type-journey" id="work-journey-top" ref={root}>
  <section className="home-work-showcase work-journey-overview" aria-label={ar?'أعمال دي جي خليل':'DJ Khalil’s work'}>
   <div className="work-overview-intro">
    <div className="work-overview-portrait" aria-hidden="true"><img src="/echo/music-hero-khalil.webp" alt="" width="1162" height="1014" fetchPriority="high"/><img className="work-overview-groove" src="/echo/music-hero-khalil.webp" alt="" width="1162" height="1014" decoding="async"/></div>
   </div>
   <div className="work-overview-collections">
    {intro}
   </div>
   <a className="work-journey-scroll" href="#work-story-first" aria-label={ar?'انزل لتكتشف كل نوع':'Scroll to discover each sound'}><ArrowDown size={22}/></a>
  </section>
  <div className="work-stories">{workTypes.map((work,index)=>{
   const {name,details}=djWorkTypeText(work,ar);
   return <section key={work.id} data-work={work.id} data-tone={index%6} id={index===0?'work-story-first':`work-story-${work.id.toLowerCase()}`} className={`work-story${index%2?' is-card-right':''}${(playing||reelPlaying)&&activeType===work.id?' is-playing':''}${entered.current.has(work.id)?' is-box-entered':''}`} aria-labelledby={`work-story-title-${work.id}`}>
    <div className="work-story-card-slot"><div className="work-story-card">{renderCard(work,index)}</div></div>
    {activeType!==work.id&&<a className="work-story-listen is-under-box" href="#work-journey-top">{ar?'العودة إلى الأعلى':'Back to top'}<ArrowUp size={18}/></a>}
    <div className="work-story-copy" id={`work-story-copy-${work.id}`}><div className="work-story-copy-inner">
     <span className="work-story-number">{String(index+1).padStart(2,'0')} / {name}</span>
     <h3 id={`work-story-title-${work.id}`}>{name}</h3>
     {details&&<p id={`work-story-description-${work.id}`}>{details}</p>}
     {activeType!==work.id&&<a className="work-story-listen" href="#work-journey-top">{ar?'العودة إلى الأعلى':'Back to top'}<ArrowUp size={18}/></a>}
    </div></div>
   </section>;
  })}</div>
 </div>;
}
