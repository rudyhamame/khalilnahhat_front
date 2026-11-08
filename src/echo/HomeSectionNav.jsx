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
 ['availability',CalendarDays,'Booking Event','حجز فعالية'],
 ['work',Disc3,'DJ Service','خدمة الدي جي'],
 ['setup',Boxes,'Rental Services / Equipment','خدمات التأجير والمعدات'],
 ['contact',Mail,'Contact','تواصل معنا'],
 ['about',UserRound,'About','نبذة عنا'],
];

export default function HomeSectionNav({ar=false}){
 const [active,setActive]=useState('home');
 const [visible,setVisible]=useState(false);
 const [dockedLeft,setDockedLeft]=useState(false);
 const nav=useRef(null),dock=useRef(false),previousPositions=useRef(new Map()),animations=useRef([]);
 useLayoutEffect(()=>{
  const previous=previousPositions.current;previousPositions.current=new Map();
  animations.current.forEach(animation=>animation.cancel());animations.current=[];
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;
  for(const button of nav.current?.querySelectorAll('button,a')||[]){
   const from=previous.get(button);if(!from)continue;
   const to=button.getBoundingClientRect();
   animations.current.push(button.animate([
    {transform:`translate(${from.left-to.left}px,${from.top-to.top}px)`},
    {transform:'translate(0,0)'},
   ],{duration:650,easing:'cubic-bezier(.22,1,.36,1)'}));
  }
 },[dockedLeft]);
 useEffect(()=>()=>animations.current.forEach(animation=>animation.cancel()),[]);
 useEffect(()=>{
  const surface=document.querySelector('.preflight-app-content');
  const update=()=>setVisible(!surface||surface.getAttribute('aria-hidden')!=='true');
  const observer=new MutationObserver(update);if(surface)observer.observe(surface,{attributes:true,attributeFilter:['aria-hidden']});update();
  return()=>observer.disconnect();
 },[]);
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
   const nextDock=Boolean(hero&&hero.getBoundingClientRect().bottom<innerHeight*.75);
   if(nextDock!==dock.current){
    previousPositions.current=new Map([...nav.current?.querySelectorAll('button,a')||[]].map(button=>[button,button.getBoundingClientRect()]));
    dock.current=nextDock;setDockedLeft(nextDock);
   }
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
  onClick={()=>scrollToAppSection(id,{source:'section-nav'})}
 ><Icon size={20} strokeWidth={1.6} aria-hidden="true"/></button>;
 const assistantLabel=order?.panelOpen
  ?(ar?'إظهار مساعد إيكو الذكي':'Show Echo AI Assistant')
  :(ar?'فتح مساعد إيكو الذكي':'Open Echo AI Assistant');
 if(!visible)return null;
 return createPortal(<nav ref={nav} className="home-section-nav" data-docked-left={dockedLeft||undefined} dir={ar?'rtl':'ltr'} aria-label={ar?'أقسام التطبيق':'App sections'}>
  {destinations.map((destination,index)=><Fragment key={destination[0]}>
   {index===4&&order?.assistantAvailable&&<button type="button" className="home-section-ai" aria-label={assistantLabel} data-tooltip="Echo AI Assistant" aria-expanded={Boolean(order?.panelOpen)} aria-controls="event-order-panel" onClick={()=>order?.openAssistant({source:'navigation'})}><Sparkles size={25} strokeWidth={1.7} aria-hidden="true"/></button>}
   {destination[0]==='setup'?<BookingCart ar={ar}>{destinationButton(destination)}</BookingCart>:destinationButton(destination)}
  </Fragment>)}
 </nav>,document.body);
}
