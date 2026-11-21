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
 useEffect(()=>subscribeArchivePlayerState(event=>setPlaying(Boolean(event.detail?.playing))),[]);
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
 const renderCard=(work,index)=>renderWorkCard(work,index,{compact:false,active:activeType===work.id,onOpen:()=>onOpenWork?.(work.id)});

 // Opening a box makes its whole section one full screen and scrolls that section to the very top of the screen (the page's own smooth scrolling does the movement). The section grows while it opens, so it is aligned again once it has its final size.
 useEffect(()=>{
  if(!activeType)return undefined;
  const slot=()=>root.current?.querySelector(`.work-story[data-work="${activeType}"]`);
  const centre=()=>{const target=slot();if(!target)return false;target.scrollIntoView({behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start',inline:'nearest'});return true;};
  // A link straight to a recording sets the type before the boxes have loaded: keep looking for the box (up to about 8 seconds), centre it once it exists, then centre again after it has grown.
  let later=0,tries=0;
  const poll=setInterval(()=>{if(centre()){clearInterval(poll);later=setTimeout(centre,750);}else if(++tries>40)clearInterval(poll);},200);
  if(centre()){clearInterval(poll);later=setTimeout(centre,750);}
  return()=>{clearInterval(poll);clearTimeout(later);};
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
   return <section key={work.id} data-work={work.id} data-tone={index%6} id={index===0?'work-story-first':`work-story-${work.id.toLowerCase()}`} className={`work-story${index%2?' is-card-right':''}${playing&&activeType===work.id?' is-playing':''}${entered.current.has(work.id)?' is-box-entered':''}`} aria-labelledby={`work-story-title-${work.id}`}>
    <div className="work-story-card-slot"><div className="work-story-card">{renderCard(work,index)}</div></div>
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
