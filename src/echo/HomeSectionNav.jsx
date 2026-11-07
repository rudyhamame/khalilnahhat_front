import BookingCart from './BookingCart';
import {createPortal} from 'react-dom';
import {Fragment,useEffect,useState} from 'react';
import {Home,TreePine,Radio,CalendarDays,Disc3,Boxes,UserRound,LayoutDashboard,Sparkles} from 'lucide-react';
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
 ['about',UserRound,'About','نبذة عنا'],
];

export default function HomeSectionNav({ar=false,user}){
 const [active,setActive]=useState('home');
 const [visible,setVisible]=useState(false);
 // The dock lives outside transformed page/queue containers. Keep it hidden
 // until preflight reveals the app, just like the rest of the interface.
 useEffect(()=>{
  const surface=document.querySelector('.preflight-app-content');
  const update=()=>setVisible(!surface||surface.getAttribute('aria-hidden')!=='true');
  update();
  if(!surface)return;
  const observer=new MutationObserver(update);
  observer.observe(surface,{attributes:true,attributeFilter:['aria-hidden']});
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
    if(id==='tree'){
     if(rect.height>innerHeight-header+20&&rect.top<-(rect.height-(innerHeight-header))*.5)current='tree';
    }else if(rect.top<=anchor)current=id;
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
  onClick={()=>scrollToAppSection(id,{source:'section-nav'})}
 ><Icon size={20} strokeWidth={1.6} aria-hidden="true"/></button>;
 const assistantLabel=order?.panelOpen
  ?(ar?'إغلاق مساعد إيكو الذكي':'Close Echo AI Assistant')
  :(ar?'فتح مساعد إيكو الذكي':'Open Echo AI Assistant');
 if(!visible)return null;
 return createPortal(<nav className="home-section-nav" dir={ar?'rtl':'ltr'} aria-label={ar?'أقسام التطبيق':'App sections'}>
  {destinations.map((destination,index)=><Fragment key={destination[0]}>
   {index===4&&<button type="button" className="home-section-ai" aria-label={assistantLabel} data-tooltip="Echo AI Assistant" aria-expanded={Boolean(order?.panelOpen)} aria-controls="event-order-panel" onClick={()=>order?.panelOpen?order.closeAssistant():order?.openAssistant()}><Sparkles size={25} strokeWidth={1.7} aria-hidden="true"/></button>}
   {destination[0]==='setup'?<BookingCart ar={ar}>{destinationButton(destination)}</BookingCart>:destinationButton(destination)}
  </Fragment>)}
  <a className="home-section-dashboard" href={user?.isAdmin?'/admin/live-stream':'/dashboard'} aria-label={ar?'لوحة التحكم':'Dashboard'} data-tooltip={ar?'لوحة التحكم':'Dashboard'}><LayoutDashboard size={20} strokeWidth={1.6} aria-hidden="true"/></a>
 </nav>,document.body);
}
