import {Home,TreePine,Radio,CalendarDays,Disc3,Boxes,Box,Mail,Info,Sparkles} from 'lucide-react';
import {useEffect,useRef} from 'react';
import {PUBLIC_PAGE_PATHS,publicPageSection} from '../lib/publicPages';
import {SEASONAL_TREE_ENABLED} from '../config/features';
import './headerNav.css';

const destinations=[
 ['home',Home,'Home','الرئيسية'],
 ['work',Disc3,'Music','الموسيقى'],
 ['availability',CalendarDays,'Booking Event','حجز فعالية'],
 ['setup',Boxes,'Rentals','التأجير'],
 ['room',Box,'3D Room','الغرفة ثلاثية الأبعاد'],
 ['live',Radio,'Live','البث المباشر'],
 ['about',Info,'About','نبذة عنا'],
 ['contact',Mail,'Contact','تواصل معنا'],
 ['assistant',Sparkles,'Echo AI','إيكو الذكي'],
 ...(SEASONAL_TREE_ENABLED?[['tree',TreePine,'Tree','الشجرة']]:[]),
];
const portraitLabels={home:['Home','الرئيسية'],tree:['Tree','الشجرة'],live:['Live','مباشر'],assistant:['Echo AI','إيكو'],room:['3D Room','ثلاثي'],availability:['Book','الحجز'],work:['Music','الموسيقى'],setup:['Rentals','التأجير'],contact:['Contact','تواصل'],about:['About','نبذة']};


// The app's section buttons live in the header (the left rail is gone). Not shown on the greeting page.
export default function HeaderNav({ar=false,path}){
 const section=publicPageSection(path)||'home',active=section==='player'?'work':section;
 const nav=useRef(null);
 useEffect(()=>{nav.current?.querySelector('[aria-current="location"]')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});},[active]);
 if(section==='home')return null;
 return <nav ref={nav} className="echo-header-nav" aria-label={ar?'أقسام التطبيق':'App sections'}>{destinations.map(([id,Icon,en,arabic])=>{
  const link=<a className="echo-header-nav-button" href={PUBLIC_PAGE_PATHS[id]} aria-label={ar?arabic:en} title={ar?arabic:en} aria-current={active===id?'location':undefined}><Icon size={20} strokeWidth={1.8} aria-hidden="true"/><span aria-hidden="true">{portraitLabels[id][ar?1:0]}</span></a>;
  return <div key={id} className="echo-header-nav-item">{link}</div>;
 })}</nav>;
}
