import BookingCart from './BookingCart';
import {createPortal} from 'react-dom';
import {Fragment,useEffect,useState} from 'react';
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
 const [visible,setVisible]=useState(false);
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
 if(!visible)return null;
 return createPortal(<nav className="home-section-nav" dir={ar?'rtl':'ltr'} aria-label={ar?'أقسام التطبيق':'App sections'}>
  {destinations.map((destination)=><Fragment key={destination[0]}>

   {destination[0]==='setup'?<BookingCart ar={ar}>{destinationButton(destination)}</BookingCart>:destinationButton(destination)}
  </Fragment>)}
 </nav>,document.body);
}
