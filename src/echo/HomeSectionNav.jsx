import BookingCart from './BookingCart';
import {createPortal} from 'react-dom';
import {Fragment,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Home,TreePine,Radio,CalendarDays,Disc3,Boxes,Mail,UserRound,Sparkles} from 'lucide-react';
import {APP_VIEWPORT_TARGETS,scrollToAppSection} from '../lib/bookingViewport';
import {useEventOrder} from './eventOrderContext';
import './homeSectionNav.css';
import './echoTooltip.css';

const destinations=[
 ['home',Home,'Home','الرئيسية'],
 ['tree',TreePine,'Tree','الشجرة'],
 ['live',Radio,'Live','البث المباشر'],
 ['assistant',Sparkles,'Echo AI','إيكو الذكي'],
 ['availability',CalendarDays,'Booking Event','حجز فعالية'],
 ['work',Disc3,'DJ Service','خدمة الدي جي'],
 ['setup',Boxes,'Rental Services / Equipment','خدمات التأجير والمعدات'],
 ['contact',Mail,'Contact','تواصل معنا'],
 ['about',UserRound,'About','نبذة عنا'],
];

export default function HomeSectionNav({ar=false}){
 const [active,setActive]=useState('home');
 const [pastIntro,setPastIntro]=useState(false);
 const nav=useRef(null);
 useLayoutEffect(()=>{
  const element=nav.current;if(!element)return;
  const portrait=window.matchMedia('(orientation:portrait)');
  const align=()=>{
   const pixels=window.devicePixelRatio||1;
   const viewport=window.visualViewport;
   if(viewport&&Math.abs(viewport.scale-1)>.01)return;
   const height=Math.min(window.innerHeight,viewport?.height||window.innerHeight);
   if(portrait.matches){
    element.style.top='auto';element.style.removeProperty('max-height');
    element.style.setProperty('--home-nav-bottom',`${Math.max(0,window.innerHeight-(viewport?.offsetTop||0)-height)}px`);
    return;
   }
   element.style.removeProperty('--home-nav-bottom');
   element.style.maxHeight=`${Math.max(1,height-16)}px`;
   const top=(viewport?.offsetTop||0)+Math.max(8,(height-element.getBoundingClientRect().height)/2);
   element.style.top=`${Math.round(top*pixels)/pixels}px`;
  };
  const observer=new ResizeObserver(align);observer.observe(element);
  portrait.addEventListener('change',align);
  window.addEventListener('resize',align);window.visualViewport?.addEventListener('resize',align);window.visualViewport?.addEventListener('scroll',align);align();
  return()=>{observer.disconnect();portrait.removeEventListener('change',align);window.removeEventListener('resize',align);window.visualViewport?.removeEventListener('resize',align);window.visualViewport?.removeEventListener('scroll',align);};
 },[pastIntro]);
 const order=useEventOrder();
 useEffect(()=>{
  let frame=0;
  const update=()=>{
   frame=0;
   const header=Math.max(0,document.querySelector('.echo-header')?.getBoundingClientRect().bottom||0);
   const anchor=header+(innerHeight-header)*.35;
   let current='home';
   for(const [id] of destinations){
    const element=document.querySelector(APP_VIEWPORT_TARGETS[id]);
    if(!element)continue;
    const rect=element.getBoundingClientRect();
    if(rect.top<=anchor)current=id;
   }
   setActive(current);
   const hero=document.querySelector('.hero-introduction');
   setPastIntro(Boolean(hero&&hero.getBoundingClientRect().bottom<innerHeight*.75));

  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
  update();
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',schedule);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('scroll',schedule);window.removeEventListener('resize',schedule);};
 },[]);
 const destinationButton=([id,Icon,en,arabic])=><button
  type="button"
  aria-label={ar?arabic:en}
  data-tooltip={ar?arabic:en}
  aria-current={active===id?'location':undefined}
  onClick={()=>id==='assistant'?order?.openAssistant({source:'navigation'}):scrollToAppSection(id,{source:'section-nav'})}
 ><Icon size={20} strokeWidth={2} aria-hidden="true"/></button>;
 if(!pastIntro)return null;
 return createPortal(<nav ref={nav} className="home-section-nav" dir={ar?'rtl':'ltr'} aria-label={ar?'أقسام التطبيق':'App sections'}>
  {destinations.map((destination)=><Fragment key={destination[0]}>

   {destination[0]==='setup'?<BookingCart ar={ar}>{destinationButton(destination)}</BookingCart>:destinationButton(destination)}
  </Fragment>)}
 </nav>,document.body);
}
