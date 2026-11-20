import {useEffect,useRef,useState} from 'react';
import {LayoutDashboard,LogOut,UserRound,Home,TreePine,Radio,CalendarDays,Disc3,Boxes,Box,Mail,Info} from 'lucide-react';
import {PUBLIC_PAGE_PATHS,publicPageSection} from '../lib/publicPages';
import {SEASONAL_TREE_ENABLED} from '../config/features';
import './accountMenu.css';

const destinations=[
 ['home',Home,'Home','الرئيسية'],['work',Disc3,'Music','الموسيقى'],['availability',CalendarDays,'Event','فعالية'],['setup',Boxes,'Services','الخدمات'],
 ['room',Box,'3D Room','الغرفة ثلاثية الأبعاد'],['live',Radio,'Live','البث المباشر'],['about',Info,'About','نبذة عنا'],['contact',Mail,'Contact','تواصل معنا'],
 ...(SEASONAL_TREE_ENABLED?[['tree',TreePine,'Tree','الشجرة']]:[]),
];
// The account badge in the header: a button that drops down Dashboard and Log out.
export default function AccountMenu({user=null,ar=false,badge,onLogout,path='/'}){
 const [open,setOpen]=useState(false),root=useRef(null),first=useRef(null);
 const active=publicPageSection(path)||'home',dashboard=user?.isAdmin?'/admin/live-stream':'/dashboard',tr=(en,arabic)=>ar?arabic:en;
 useEffect(()=>{
  if(!open)return undefined;
  const outside=event=>{if(!root.current?.contains(event.target))setOpen(false);};
  const key=event=>{if(event.key==='Escape'){setOpen(false);root.current?.querySelector('button')?.focus();}};
  document.addEventListener('pointerdown',outside);document.addEventListener('keydown',key);
  first.current?.focus();
  return()=>{document.removeEventListener('pointerdown',outside);document.removeEventListener('keydown',key);};
 },[open]);
 return <div className="echo-account-menu" ref={root} dir={ar?'rtl':'ltr'}>
  <button type="button" className="echo-icon-button" aria-haspopup="menu" aria-expanded={open} aria-label={tr('Account menu','قائمة الحساب')} title={tr('Account','الحساب')} onClick={()=>setOpen(value=>!value)}>{badge}</button>
  {open&&<div className="echo-account-dropdown" role="menu" aria-label={tr('Account','الحساب')}>
   {user?<a ref={first} role="menuitem" href={dashboard}><LayoutDashboard size={16} aria-hidden="true"/><span>{tr('Dashboard','لوحة التحكم')}</span></a>:<a ref={first} role="menuitem" href="/login"><UserRound size={16} aria-hidden="true"/><span>{tr('Log in','تسجيل الدخول')}</span></a>}
   {destinations.map(([id,Icon,en,arabic])=><a key={id} role="menuitem" href={PUBLIC_PAGE_PATHS[id]} aria-current={active===id?'location':undefined}><Icon size={16} aria-hidden="true"/><span>{tr(en,arabic)}</span></a>)}
   {user&&<button type="button" role="menuitem" onClick={()=>{setOpen(false);onLogout?.();}}><LogOut size={16} aria-hidden="true"/><span>{tr('Log out','تسجيل الخروج')}</span></button>}
  </div>}
 </div>;
}
