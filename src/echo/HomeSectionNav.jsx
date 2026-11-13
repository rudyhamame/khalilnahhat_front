import BookingCart from './BookingCart';
import {createPortal} from 'react-dom';
import {Fragment,useLayoutEffect,useRef} from 'react';
import {Home,TreePine,Radio,CalendarDays,Disc3,Boxes,Box,Mail,Info,UserRound,Sparkles} from 'lucide-react';
import {PUBLIC_PAGE_PATHS,publicPageSection} from '../lib/publicPages';
import {useEventOrder} from './eventOrderContext';
import {SEASONAL_TREE_ENABLED} from '../config/features';
import './homeSectionNav.css';
import './echoTooltip.css';

const destinations=[
 ['home',Home,'Home','الرئيسية'],
 ['work',Disc3,'Music','الموسيقى'],
 ['setup',Boxes,'Rentals','التأجير'],
 ['room',Box,'3D Room','الغرفة ثلاثية الأبعاد'],
 ['availability',CalendarDays,'Booking Event','حجز فعالية'],
 ['about',Info,'About','نبذة عنا'],
 ['contact',Mail,'Contact','تواصل معنا'],
 ['live',Radio,'Live','البث المباشر'],
 ['assistant',Sparkles,'Echo AI','إيكو الذكي'],
 ...(SEASONAL_TREE_ENABLED?[['tree',TreePine,'Tree','الشجرة']]:[]),
];
const portraitLabels={home:['Home','الرئيسية'],tree:['Tree','الشجرة'],live:['Live','مباشر'],assistant:['Echo AI','إيكو'],room:['3D Room','ثلاثي'],availability:['Book','الحجز'],work:['Music','الموسيقى'],setup:['Rentals','التأجير'],contact:['Contact','تواصل'],about:['About','نبذة']};

export default function HomeSectionNav({ar=false}){
 const active=publicPageSection(window.location.pathname)||'home';
 const nav=useRef(null);
 useLayoutEffect(()=>{
  const element=nav.current;if(!element)return;
  const portrait=window.matchMedia('(orientation:portrait)');
  const align=()=>{
   if(element.closest('.home-live-navigation')){element.style.removeProperty('top');element.style.removeProperty('max-height');document.documentElement.style.removeProperty('--home-nav-end');return;}
   const pixels=window.devicePixelRatio||1;
   const viewport=window.visualViewport;
   if(viewport&&Math.abs(viewport.scale-1)>.01)return;
   if(document.activeElement?.matches?.('input,textarea,select,[contenteditable]'))return;
   const height=Math.min(window.innerHeight,viewport?.height||window.innerHeight);
   if(portrait.matches){
    element.style.top='auto';element.style.removeProperty('max-height');
    element.style.removeProperty('--home-nav-bottom');document.documentElement.style.removeProperty('--home-nav-end');
    return;
   }
   element.style.removeProperty('--home-nav-bottom');
   element.style.maxHeight=`${Math.max(1,height-16)}px`;
   const top=(viewport?.offsetTop||0)+Math.max(8,(height-element.getBoundingClientRect().height)/2);
   element.style.top=`${Math.round(top*pixels)/pixels}px`;
   document.documentElement.style.setProperty('--home-nav-end',`${Math.round(top+element.getBoundingClientRect().height+8)}px`);
  };
  const observer=new ResizeObserver(align);observer.observe(element);
  portrait.addEventListener('change',align);
  window.addEventListener('resize',align);window.visualViewport?.addEventListener('resize',align);window.visualViewport?.addEventListener('scroll',align);align();
  return()=>{document.documentElement.style.removeProperty('--home-nav-end');observer.disconnect();portrait.removeEventListener('change',align);window.removeEventListener('resize',align);window.visualViewport?.removeEventListener('resize',align);window.visualViewport?.removeEventListener('scroll',align);};
 },[active]);
 const order=useEventOrder();
 const destinationButton=([id,Icon,en,arabic])=><a
  href={PUBLIC_PAGE_PATHS[id]}
  data-document-navigation
  className="home-nav-button"
  aria-label={ar?arabic:en}
  data-tooltip={ar?arabic:en}
  aria-current={active===id?'location':undefined}
 ><Icon size={20} strokeWidth={1.8} aria-hidden="true"/><span className="home-nav-label" aria-hidden="true">{portraitLabels[id][ar?1:0]}</span></a>;
 const liveNavigation=active==='live'?document.querySelector('#live .home-live-navigation'):null;
 return <>{createPortal(<nav ref={nav} className="home-section-nav" dir={ar?'rtl':'ltr'} aria-label={ar?'أقسام التطبيق':'App sections'}>
  {destinations.map((destination)=><Fragment key={destination[0]}>

   {destinationButton(destination)}
  </Fragment>)}
  <span className="home-nav-separator" role="separator" aria-hidden="true"/>
  <a data-document-navigation className="home-nav-button home-nav-account" href={order?.user?(order.user.isAdmin?'/admin/live-stream':'/dashboard'):'/login'} aria-label={order?.user?(ar?'لوحة التحكم':'Dashboard'):(ar?'تسجيل الدخول':'Sign in')} data-tooltip={order?.user?(ar?'لوحة التحكم':'Dashboard'):(ar?'تسجيل الدخول':'Sign in')}><UserRound size={20} strokeWidth={1.8} aria-hidden="true"/><span className="home-nav-label" aria-hidden="true">{ar?'حسابي':'Account'}</span></a>
 </nav>,liveNavigation||document.body)}<BookingCart ar={ar}/></>;
}
