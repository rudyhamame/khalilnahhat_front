import {Menu,ChevronDown,Home,TreePine,Radio,CalendarDays,Disc3,Boxes,Box,Mail,Info,Sparkles} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {PUBLIC_PAGE_PATHS,publicPageSection} from '../lib/publicPages';
import {SEASONAL_TREE_ENABLED} from '../config/features';
import {displayImageUrl} from '../lib/displayImage';
import {useArchivePlayerState} from '../hooks/useArchivePlayerState';
import './headerNav.css';

const destinations=[
 ['home',Home,'Home','الرئيسية'],
 ['work',Disc3,'Music','الموسيقى'],
 ['availability',CalendarDays,'Event','فعالية'],
 ['setup',Boxes,'Services','الخدمات'],
 ['room',Box,'3D Room','الغرفة ثلاثية الأبعاد'],
 ['live',Radio,'Live','البث المباشر'],
 ['about',Info,'About','نبذة عنا'],
 ['contact',Mail,'Contact','تواصل معنا'],
 ['assistant',Sparkles,'Echo AI','إيكو الذكي'],
 ...(SEASONAL_TREE_ENABLED?[['tree',TreePine,'Tree','الشجرة']]:[]),
];
const portraitLabels={home:['Home','الرئيسية'],tree:['Tree','الشجرة'],live:['Live','مباشر'],assistant:['Echo AI','إيكو'],room:['3D Room','ثلاثي'],availability:['Event','فعالية'],work:['Music','الموسيقى'],setup:['Services','الخدمات'],contact:['Contact','تواصل'],about:['About','نبذة']};


// The app's section buttons live in the header (the left rail is gone). Not shown on the greeting page.
export default function HeaderNav({ar=false,path}){
 const section=publicPageSection(path)||(path==='/login'?'login':'home'),active=section;
 const nav=useRef(null),[open,setOpen]=useState(false),player=useArchivePlayerState(),track=player.track,art=track?displayImageUrl(track.coverImage):'';
 useEffect(()=>{nav.current?.querySelector('[aria-current="location"]')?.scrollIntoView({block:'nearest',inline:'nearest',behavior:'instant'});},[active]);
 if(section==='home')return null;
 return <nav ref={nav} className={`echo-header-nav${open?' is-open':''}`} aria-label={ar?'أقسام التطبيق':'App sections'}>
  {/* Phones: the sections are tucked into this menu button (closed by default). */}
  <button type="button" className="echo-nav-toggle" aria-expanded={open} aria-controls="echo-nav-list" onClick={()=>setOpen(value=>!value)}><Menu size={20} aria-hidden="true"/><span>{ar?'القائمة':'Menu'}</span><ChevronDown size={18} className="echo-nav-chevron" aria-hidden="true"/></button>
  <div id="echo-nav-list" className="echo-nav-list">{destinations.map(([id,Icon,en,arabic])=>{
  // While a recording is loaded, the Music icon becomes its record (spinning while it plays) and opens that recording's player.
  if(id==='work'&&track){
   const label=`${ar?'قيد التشغيل':'Now playing'}: ${track.title}`;
   return <div key={id} className="echo-header-nav-item"><a className="echo-header-nav-button has-record" href={`/music?play=${encodeURIComponent(track.recordingType||'')}`} aria-label={label} title={label} aria-current={active===id?'location':undefined}
    onClick={event=>{if(path==='/music'){event.preventDefault();window.dispatchEvent(new CustomEvent('echo:work-player-open',{detail:{type:track.recordingType,trackId:track.id}}));}}}>
    <span className={`nav-record${player.playing?' is-spinning':''}`} aria-hidden="true">{art?<img src={art} alt=""/>:<Disc3 size={20} strokeWidth={1.8}/>}</span><span aria-hidden="true">{portraitLabels[id][ar?1:0]}</span></a></div>;
  }
  const link=<a className="echo-header-nav-button" href={PUBLIC_PAGE_PATHS[id]} aria-label={ar?arabic:en} title={ar?arabic:en} aria-current={active===id?'location':undefined}><Icon size={20} strokeWidth={1.8} aria-hidden="true"/><span aria-hidden="true">{portraitLabels[id][ar?1:0]}</span></a>;
  return <div key={id} className="echo-header-nav-item">{link}</div>;
 })}
  {/* The booking summary button lives in the nav (BookingCart finds this slot by id; it stays mounted while the menu is closed). */}
  <div className="echo-header-nav-item is-cart"><span id="echo-header-cart" className="echo-header-cart"/></div>
  </div></nav>;
}
