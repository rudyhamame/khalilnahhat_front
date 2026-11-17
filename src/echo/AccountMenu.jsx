import {useEffect,useRef,useState} from 'react';
import {LayoutDashboard,LogOut} from 'lucide-react';
import './accountMenu.css';

// The account badge in the header: a button that drops down Dashboard and Log out.
export default function AccountMenu({user,ar=false,badge,onLogout}){
 const [open,setOpen]=useState(false),root=useRef(null),first=useRef(null);
 const dashboard=user?.isAdmin?'/admin/live-stream':'/dashboard',tr=(en,arabic)=>ar?arabic:en;
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
   <a ref={first} role="menuitem" href={dashboard}><LayoutDashboard size={16} aria-hidden="true"/><span>{tr('Dashboard','لوحة التحكم')}</span></a>
   <button type="button" role="menuitem" onClick={()=>{setOpen(false);onLogout?.();}}><LogOut size={16} aria-hidden="true"/><span>{tr('Log out','تسجيل الخروج')}</span></button>
  </div>}
 </div>;
}
