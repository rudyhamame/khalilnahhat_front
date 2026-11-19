import {useSyncExternalStore} from 'react';
import {PUBLIC_PAGE_PATHS} from '../lib/publicPages';
import SmartCartIcon from './SmartCartIcon';
import './smartCartLauncher.css';

const readDirection=()=>typeof document!=='undefined'&&document.documentElement.dir==='rtl';
const subscribeDirection=notify=>{
 const observer=new MutationObserver(notify);
 observer.observe(document.documentElement,{attributes:true,attributeFilter:['dir']});
 return()=>observer.disconnect();
};

const readPath=()=>typeof window!=='undefined'?window.location.pathname:'';
const subscribePath=notify=>{window.addEventListener('popstate',notify);return()=>window.removeEventListener('popstate',notify);};

// Mounted once outside page routes (dashboards, the 3D room). Hidden on the login and home pages.
export default function SmartCartLauncher({ar}){
 const rtl=useSyncExternalStore(subscribeDirection,readDirection,()=>false),path=useSyncExternalStore(subscribePath,readPath,()=>'');
 if(path==='/'||path==='/login')return null;
 const arabic=ar??rtl,label=arabic?'افتح عربة إيكو الذكية':'Open Echo Smart Cart';
 const open=event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey)return;
  if(window.location.pathname!==PUBLIC_PAGE_PATHS.assistant)return;
  event.preventDefault();
  window.dispatchEvent(new Event('echo:assistant-conversation'));
  requestAnimationFrame(()=>document.getElementById('ai-booking-message')?.focus({preventScroll:true}));
 };
 return <a className="echo-cart-launch" dir={arabic?'rtl':'ltr'} href={PUBLIC_PAGE_PATHS.assistant} onClick={open} aria-label={label} data-tip={label}><SmartCartIcon size={22} strokeWidth={1.8} aria-hidden="true"/></a>;
}
