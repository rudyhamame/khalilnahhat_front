import {useEffect,useState} from 'react';
import {Home,TreePine,Radio,CalendarDays,Disc3,Boxes,UserRound} from 'lucide-react';
import {APP_VIEWPORT_TARGETS,scrollToAppSection} from '../lib/bookingViewport';
import './homeSectionNav.css';

const destinations=[
 ['home',Home,'Home','الرئيسية'],
 ['tree',TreePine,'Tree','الشجرة'],
 ['live',Radio,'Live','البث المباشر'],
 ['availability',CalendarDays,'Booking Event','حجز فعالية'],
 ['work',Disc3,'DJ Service','خدمة الدي جي'],
 ['setup',Boxes,'Rental Services / Equipment','خدمات التأجير والمعدات'],
 ['about',UserRound,'About','نبذة عنا'],
];

export default function HomeSectionNav({ar=false}){
 const [active,setActive]=useState('home');
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
 return <nav className="home-section-nav" aria-label={ar?'أقسام التطبيق':'App sections'}>{destinations.map(([id,Icon,en,arabic])=><button key={id} type="button" aria-label={ar?arabic:en} title={ar?arabic:en} aria-current={active===id?'location':undefined} onClick={()=>scrollToAppSection(id,{source:'section-nav'})}><Icon size={20} strokeWidth={1.6} aria-hidden="true"/></button>)}</nav>;
}
