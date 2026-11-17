import {Menu,ChevronDown,Home,TreePine,Film,Radio,CalendarDays,Disc3,Boxes,Box,Mail,Info,createLucideIcon} from 'lucide-react';
import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {PUBLIC_PAGE_PATHS,publicPageSection} from '../lib/publicPages';
import {SEASONAL_TREE_ENABLED} from '../config/features';
import {displayImageUrl} from '../lib/displayImage';
import {useArchivePlayerState} from '../hooks/useArchivePlayerState';
import './headerNav.css';

const SmartCartIcon=createLucideIcon('SmartCart',[
 ['path',{d:'M2 3h2l3 13h12l2-6H7',key:'cart'}],
 ['circle',{cx:'9',cy:'21',r:'1',key:'left-wheel'}],
 ['circle',{cx:'18',cy:'21',r:'1',key:'right-wheel'}],
 ['path',{d:'m16 1 1.1 3.9L21 6l-3.9 1.1L16 11l-1.1-3.9L11 6l3.9-1.1L16 1Z',key:'smart'}],
]);

const destinations=[
 ['home',Home,'Home','الرئيسية'],
 ['work',Disc3,'Music','الموسيقى'],
 ['availability',CalendarDays,'Event','فعالية'],
 ['setup',Boxes,'Services','الخدمات'],
 ['room',Box,'3D Room','الغرفة ثلاثية الأبعاد'],
 ['live',Film,'Reel','ريل'],
 ['about',Info,'About','نبذة عنا'],
 ['contact',Mail,'Contact','تواصل معنا'],
 ['assistant',SmartCartIcon,'Echo Smart Cart','عربة إيكو الذكية'],
 ...(SEASONAL_TREE_ENABLED?[['tree',TreePine,'Tree','الشجرة']]:[]),
];
const portraitLabels={home:['Home','الرئيسية'],tree:['Tree','الشجرة'],live:['Reel','ريل'],assistant:['Echo Smart Cart','عربة إيكو الذكية'],room:['3D Room','ثلاثي'],availability:['Event','فعالية'],work:['Music','الموسيقى'],setup:['Services','الخدمات'],contact:['Contact','تواصل'],about:['About','نبذة']};



// Animates the nav whenever its items change (a button mounts or unmounts, a button grows, the window or language changes):
// items that stay slide to their new place instead of jumping (FLIP), new items fade and scale in. Nothing animates on first paint.
function useNavMotion(nav){
 useLayoutEffect(()=>{
  const list=nav.current;if(!list||typeof ResizeObserver==='undefined')return undefined;
  const reduced=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const items=()=>[...list.querySelectorAll('.echo-header-nav-item')];
  const measure=()=>new Map(items().map(el=>[el,{left:el.getBoundingClientRect().left,width:el.offsetWidth}]));
  // Positions are read without any running slide, so a slide in progress never compounds.
  const settled=()=>{items().forEach(el=>(el.getAnimations?.()||[]).filter(animation=>animation.id==='nav-flip').forEach(animation=>animation.cancel()));return measure();};
  let before=settled();
  const play=()=>{
    const after=settled();
    if(!reduced())for(const [el,box] of after){
      const was=before.get(el);
      if(!was){el.animate([{opacity:0,transform:'scale(.7)'},{opacity:1,transform:'scale(1)'}],{duration:260,easing:'cubic-bezier(.2,.8,.2,1)'});continue;}
      const shift=was.left-box.left;
      if(Math.abs(shift)>1)el.animate([{transform:`translateX(${shift}px)`},{transform:'translateX(0)'}],{duration:280,easing:'cubic-bezier(.2,.8,.2,1)',id:'nav-flip'});
    }
    before=after;
  };
  const resize=new ResizeObserver(play),watch=()=>{resize.disconnect();resize.observe(list);items().forEach(el=>resize.observe(el));};
  const mutate=new MutationObserver(()=>{watch();play();});
  mutate.observe(list,{childList:true,subtree:true});watch();
  return()=>{resize.disconnect();mutate.disconnect();};
 },[nav]);
}
// The app's section buttons live in the header (the left rail is gone). Not shown on the greeting page.
export default function HeaderNav({ar=false,path}){
 const section=publicPageSection(path)||(path==='/login'?'login':'home'),active=section;
 const nav=useRef(null);useNavMotion(nav);
 const [open,setOpen]=useState(false),player=useArchivePlayerState(),track=player.track,art=track?displayImageUrl(track.coverImage):'';
 // The Echo Smart Cart opens only while a booking is active (the booking provider reports it).
 const [bookingActive,setBookingActive]=useState(()=>{try{return localStorage.getItem('echo-booking-active')==='1';}catch{return false;}});
 const assistantAvailable=bookingActive||active==='assistant';
 useEffect(()=>{const listen=event=>setBookingActive(Boolean(event.detail));window.addEventListener('echo:booking-active',listen);return()=>window.removeEventListener('echo:booking-active',listen);},[]);
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
  const disabled=id==='assistant'&&!assistantAvailable;
  const link=<a className="echo-header-nav-button" href={disabled?undefined:PUBLIC_PAGE_PATHS[id]} role={disabled?'link':undefined} aria-disabled={disabled||undefined} tabIndex={disabled?-1:undefined} aria-label={ar?arabic:en} title={ar?arabic:en} aria-current={active===id?'location':undefined}><Icon size={20} strokeWidth={1.8} aria-hidden="true"/><span aria-hidden="true">{portraitLabels[id][ar?1:0]}</span></a>;
  return <div key={id} className={`echo-header-nav-item${id==='assistant'?' is-assistant':''}`}>{link}</div>;
 })}
  </div></nav>;
}
