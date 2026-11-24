import {isMixerAvailable} from '../lib/mixerAvailability';
import {Fragment,useEffect,useRef,useState} from 'react';
import {Menu,LogOut,UserRound,Home,TreePine,Radio,CalendarDays,Disc3,Box,Mail,Info,SlidersHorizontal,Smartphone} from 'lucide-react';
import {apiBaseUrl} from '../lib/api';
import {PUBLIC_PAGE_PATHS,publicPageSection} from '../lib/publicPages';
import {SEASONAL_TREE_ENABLED} from '../config/features';
import {publishArchiveMixerState} from '../lib/archivePlayerBridge';
import './accountMenu.css';

const destinations=[
 ['home',Home,'Home','الرئيسية'],['work',Disc3,'Music','الموسيقى'],['availability',CalendarDays,'Booking','الحجز'],
 ['room',Box,'3D Room','الغرفة ثلاثية الأبعاد'],['live',Radio,'Live','البث المباشر'],['about',Info,'About','نبذة عنا'],['contact',Mail,'Contact','تواصل معنا'],
 ...(SEASONAL_TREE_ENABLED?[['tree',TreePine,'Tree','الشجرة']]:[]),
];
// The header button is the Menu icon; the menu lists Dashboard (with the account's initials badge), the pages and Log out.
export default function AccountMenu({user=null,ar=false,badge,onLogout,path='/'}){
 const [open,setOpen]=useState(false),root=useRef(null),first=useRef(null);
 const section=publicPageSection(path)||'home',active=section==='setup'?'availability':section,dashboard=user?.isAdmin?'/admin/live-stream':'/dashboard',tr=(en,arabic)=>ar?arabic:en;
 useEffect(()=>{
  if(!open)return undefined;
  const outside=event=>{if(!root.current?.contains(event.target))setOpen(false);};
  const key=event=>{if(event.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
  first.current?.focus();
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
 },[open]);
 return <div className="echo-account-menu" ref={root} dir={ar?'rtl':'ltr'}>
  <button type="button" className="echo-icon-button" aria-haspopup="menu" aria-expanded={open} aria-label={tr('Menu','القائمة')} title={tr('Menu','القائمة')} onClick={()=>setOpen(value=>!value)}><Menu size={22} aria-hidden="true"/></button>
  {open&&<div className="echo-account-dropdown" role="menu" aria-label={tr('Account','الحساب')} onClick={event=>{if(event.target.closest('a,button'))setOpen(false);}}>
   {user?<a ref={first} role="menuitem" href={dashboard}>{badge}<span>{tr('Dashboard','لوحة التحكم')}</span></a>:<a ref={first} role="menuitem" href="/login"><UserRound size={16} aria-hidden="true"/><span>{tr('Log in','تسجيل الدخول')}</span></a>}
   {user&&<div className="echo-account-menu-divider" role="separator" aria-orientation="horizontal"/>}
   {destinations.map(([id,Icon,en,arabic])=><Fragment key={id}><a role="menuitem" href={PUBLIC_PAGE_PATHS[id]} aria-current={active===id?'location':undefined}><Icon size={16} aria-hidden="true"/><span>{tr(en,arabic)}</span></a>
    {id==='work'&&<button type="button" role="menuitem" className="echo-menu-mixer" onClick={()=>{setOpen(false);if(isMixerAvailable())publishArchiveMixerState(true);}}><SlidersHorizontal size={16} aria-hidden="true"/><span>{tr('Mixer','المازج')}</span></button>}</Fragment>)}
   {user&&<button type="button" role="menuitem" onClick={()=>{setOpen(false);onLogout?.();}}><LogOut size={16} aria-hidden="true"/><span>{tr('Log out','تسجيل الخروج')}</span></button>}
   <div className="echo-account-menu-divider" role="separator" aria-orientation="horizontal"/>
   <a role="menuitem" href={`${apiBaseUrl}/android/client`} download><Smartphone size={16} aria-hidden="true"/><span>{tr('Android app','تطبيق أندرويد')}</span></a>
  </div>}
 </div>;
}
