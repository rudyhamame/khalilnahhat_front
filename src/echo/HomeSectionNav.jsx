import BookingCart from './BookingCart';
import {createPortal} from 'react-dom';
import {Fragment,useLayoutEffect,useRef,useState} from 'react';
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
 const [navigationHost,setNavigationHost]=useState(null);
 useLayoutEffect(()=>{setNavigationHost(document.getElementById('echo-main'));},[]);
 const order=useEventOrder();
 const destinationButton=([id,Icon,en,arabic])=><a
  href={PUBLIC_PAGE_PATHS[id]}
  data-document-navigation
  className="home-nav-button"
  aria-label={ar?arabic:en}
  data-tooltip={ar?arabic:en}
  aria-current={active===id?'location':undefined}
 ><Icon size={20} strokeWidth={1.8} aria-hidden="true"/><span className="home-nav-label" aria-hidden="true">{portraitLabels[id][ar?1:0]}</span></a>;
 // The greeting page (home) has no navigation rail.
 if(active==='home')return <BookingCart ar={ar}/>;
 return <>{createPortal(<nav ref={nav} className="home-section-nav" dir={ar?'rtl':'ltr'} aria-label={ar?'أقسام التطبيق':'App sections'}>
  {destinations.map((destination)=><Fragment key={destination[0]}>

   {destinationButton(destination)}
  </Fragment>)}
  <span className="home-nav-separator" role="separator" aria-hidden="true"/>
  <a data-document-navigation className="home-nav-button home-nav-account" href={order?.user?(order.user.isAdmin?'/admin/live-stream':'/dashboard'):'/login'} aria-label={order?.user?(ar?'لوحة التحكم':'Dashboard'):(ar?'تسجيل الدخول':'Sign in')} data-tooltip={order?.user?(ar?'لوحة التحكم':'Dashboard'):(ar?'تسجيل الدخول':'Sign in')}><UserRound size={20} strokeWidth={1.8} aria-hidden="true"/><span className="home-nav-label" aria-hidden="true">{ar?'حسابي':'Account'}</span></a>
 </nav>,navigationHost||document.body)}<BookingCart ar={ar}/></>;
}
