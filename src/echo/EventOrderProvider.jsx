import {equipmentQuantity} from './simulationLayout';
import OrderSignIn from './OrderSignIn';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import { X, ChevronRight } from 'lucide-react';
import { useCart,restoreOrderCart,setCartItem } from './cart';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {accountEventDraft} from '../lib/accountEventDraft';
import { createEventOrder, normalizeEventOrder, updateOrderField, applyOrderPatch, legacyToOrder } from '../lib/eventOrderCore.mjs';
import './eventOrder.css';
import './orderAsideUI.css';
import {EventOrderContext as Context,useEventOrder} from './eventOrderContext';
import AIBookingPanel from './AIBookingPanel';

const ownerKey=user=>`echo-event-order:v1:${user?.id||user?._id||user?.username||'guest'}`;
function initialState(user){
  if(!user)return {order:createEventOrder(),active:false};
  let order=createEventOrder(),active=false;
  try{
    let saved=localStorage.getItem(ownerKey(user));
    if(saved){order=normalizeEventOrder(JSON.parse(saved));active=true;}
    else {const legacy=JSON.parse(localStorage.getItem(`echo-quote-draft:${user?.id||user?._id||'guest'}`)||'null');if(legacy?.form){order=legacyToOrder(order,legacy.form);active=true;}}
  }catch{/* A corrupt or unavailable local draft must not block booking. */}
  if(user){order.customer.fullName=`${user.firstName||''} ${user.lastName||''}`.trim()||null;order.customer.email=user.email||null;order.customer.phone ||= user.phoneNumber||null;}
  return {order,active};
}

export function EventOrderProvider({user,token,lang,children,auth,reviewOnly=false}){
  const [initial]=useState(()=>initialState(user));
  // Start open when the URL asks for it: the provider remounts when the session resolves (key change), and a closed first state made the panel close and reopen.
  const [panelOpen,setPanelOpen]=useState(()=>typeof window!=='undefined'&&(['#how-to-book','#event-order'].includes(window.location.hash)||new URLSearchParams(window.location.search).get('resumeOrder')==='1'));
  const [reviewing,setReviewing]=useState(false);
  const [cloudReady,setCloudReady]=useState(false);
  const [loadRetry,setLoadRetry]=useState(0);
  const cloud=useRef(null),edited=useRef(false),deleting=useRef(false);
  const [clearing,setClearing]=useState(false);
  const [stored,setStored]=useState(initial.order),[active,setActive]=useState(initial.active),[editorOpen,setEditorOpen]=useState(false),[revision,setRevision]=useState(0),[saveState,setSaveState]=useState('');
  const cart=useCart();
  const order=useMemo(()=>({...stored,equipment:Object.values(cart).map(item=>({id:item.id,name:item.name,quantity:item.quantity}))}),[stored,cart]);
  const ar=lang.lang==='ar';
  useEffect(()=>{
    if(!user||!token){setCloudReady(false);return;}
    let alive=true;edited.current=false;setSaveState('loading');setCloudReady(false);
    const client=accountEventDraft((path,options)=>apiRequest(path,{...options,token}),setSaveState);cloud.current=client;
    client.load().then(item=>{
      if(!alive)return;
      if(item&&edited.current){client.block();return;}
      if(item){setStored(normalizeEventOrder(item.order));restoreOrderCart(item.order.equipment||[]);setActive(true);setSaveState('account-saved');}
      else setSaveState('');
      setCloudReady(true);
      if(new URLSearchParams(window.location.search).get('resumeOrder')==='1')setPanelOpen(true);
    }).catch(()=>{if(alive)setSaveState('load-failed');});
    return()=>{alive=false;client.dispose();if(cloud.current===client)cloud.current=null;};
  },[user,token,loadRetry]);
  useEffect(()=>{
    const openBooking=()=>{if(['#how-to-book','#event-order'].includes(window.location.hash))setPanelOpen(true);};
    openBooking();
    window.addEventListener('hashchange',openBooking);
    return()=>window.removeEventListener('hashchange',openBooking);
  },[user,token]);
  useLayoutEffect(()=>{
    if(document.documentElement.classList.contains('echo-order-open')!==panelOpen){
      window.dispatchEvent(new Event('echo:order-layout-changing'));
      document.documentElement.classList.toggle('echo-order-open',panelOpen);
    }
  },[panelOpen]);
  useEffect(()=>()=>document.documentElement.classList.remove('echo-order-open'),[]);
  useEffect(()=>{
    if(!panelOpen)return;
    const previous=document.activeElement;
    const frame=requestAnimationFrame(()=>document.querySelector('#event-order-panel .event-order-collapse')?.focus({preventScroll:true}));
    const dismiss=event=>{if(event.key==='Escape'){event.preventDefault();setPanelOpen(false);}};
    document.addEventListener('keydown',dismiss);
    return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',dismiss);if(previous?.isConnected)previous.focus({preventScroll:true});};
  },[panelOpen]);
  useEffect(()=>{
    if(!active||!user||!token||deleting.current)return;
    const timer=setTimeout(()=>{
      try{localStorage.setItem(ownerKey(user),JSON.stringify(order));if(!user)setSaveState('local-saved');}catch{if(!user)setSaveState('failed');}
      if(user&&cloudReady&&!deleting.current)cloud.current?.save(order);
    },400);
    return()=>clearTimeout(timer);
  },[order,active,user,token,cloudReady]);
  const begin=(source='manual',legacy)=>{
    if(deleting.current)return;
    if(!user||!token){setPanelOpen(true);return;}
    if(legacy&&Object.keys(legacy).length)edited.current=true;
    setPanelOpen(true);
    if(!active)setRevision(value=>value+1);
    setActive(true);setStored(current=>({...legacyToOrder(current,legacy),source}));
  };
  const openEditor=()=>{setPanelOpen(true);if(!user||!token)return;setActive(true);setEditorOpen(true);requestAnimationFrame(()=>document.getElementById('event-order-form')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));};
  const save=async()=>{
    if(!active||!user||!token||!cloudReady||deleting.current)return false;
    try{localStorage.setItem(ownerKey(user),JSON.stringify(order));}catch{/* Account save can still succeed without local storage. */}
    return await cloud.current?.save(order) || false;
  };
  // Saves the draft, then swaps the page content inside .echo for the full review; the ECHO AI panel stays mounted.
  const reviewInNewTab=async()=>{
    if(!active||!user||!token||deleting.current)return;
    if(!await save())return;
    setReviewing(true);
    window.scrollTo({top:0,behavior:'instant'});
  };
  const blankProfile=()=>{const blank=createEventOrder();if(user){blank.customer.fullName=`${user.firstName||''} ${user.lastName||''}`.trim()||null;blank.customer.email=user.email||null;blank.customer.phone=user.phoneNumber||null;}return blank;};
  const finish=()=>{setActive(false);cloud.current?.remove();setStored(blankProfile());try{localStorage.removeItem(ownerKey(user));localStorage.removeItem(`echo-quote-draft:${user?.id||user?._id||'guest'}`);}catch{/* Optional storage. */}};
  const clear=async()=>{
    if(!user||!token||!cloudReady||deleting.current)return false;
    deleting.current=true;setClearing(true);
    const removed=await cloud.current?.remove();
    if(!removed){deleting.current=false;setClearing(false);return false;}
    edited.current=true;setActive(false);setEditorOpen(false);setStored(blankProfile());restoreOrderCart([]);setRevision(value=>value+1);setSaveState('deleted');
    try{localStorage.removeItem(ownerKey(user));localStorage.removeItem(`echo-quote-draft:${user?.id||user?._id||'guest'}`);}catch{/* Optional storage. */}
    deleting.current=false;setClearing(false);return true;
  };
  const venueIntelligence={
    owner:user?.id||user?._id||null,
    request:(path,options={})=>{if(!user||!token){setPanelOpen(true);return Promise.reject(new Error('Sign in to research and save venues.'));}return apiRequest('/ai-booking/venue-intelligence'+path,{...options,token});},
    tile:async(z,x,y,signal)=>{const response=await fetch(`${apiBaseUrl}/ai-booking/venue-intelligence/tiles/${z}/${x}/${y}`,{headers:{Authorization:`Bearer ${token}`},signal});if(!response.ok)throw new Error('Satellite imagery could not be loaded.');return response.blob();},
  };
  const value={token,signedIn:Boolean(user&&token),venueIntelligence,requestSetupAdvice:body=>{if(!user||!token){setPanelOpen(true);return Promise.reject(new Error('Sign in to ask Echo for setup advice.'));}return apiRequest('/ai-booking/setup-advice',{method:'POST',token,body});},requestVenueArea:body=>{if(!user||!token){setPanelOpen(true);return Promise.reject(new Error('Sign in to estimate your venue area.'));}return apiRequest('/ai-booking/venue-area',{method:'POST',token,body});},setEquipment:(item,quantity)=>{if(!user||!token){setPanelOpen(true);return;}if(deleting.current)return;edited.current=true;setActive(true);setCartItem(item,equipmentQuantity(item,quantity));},order,active,panelOpen,reviewing,closeReview:()=>setReviewing(false),cloudReady,clearing,reviewInNewTab,editorOpen,revision,begin,openEditor,closeEditor:()=>setEditorOpen(false),setField:(path,val)=>{if(!user||!token||deleting.current)return;edited.current=true;setActive(true);setStored(current=>updateOrderField(current,path,val));},patchAi:patch=>{if(!user||!token||deleting.current)return;edited.current=true;setActive(true);setStored(current=>applyOrderPatch(current,patch));},applyLegacy:draft=>{if(!user||!token||deleting.current)return;edited.current=true;setStored(current=>legacyToOrder(current,draft));},save,saveState,clear,finish,retrySync:()=>setLoadRetry(value=>value+1)};
  return <Context.Provider value={value}><div className={`event-order-layout${panelOpen?' is-ordering':''}${reviewing?' is-reviewing':''}`}><div className="event-order-main">{children}</div></div>{!reviewOnly&&typeof document!=='undefined'&&createPortal(<>
    <button className="event-order-launcher" type="button" tabIndex={panelOpen?-1:0} aria-hidden={panelOpen} aria-label={ar?'احجز فعالية':'Book an event'} aria-expanded={false} aria-controls="event-order-panel" onClick={()=>setPanelOpen(true)}>
      <span className="event-order-launcher-label">{ar?'احجز فعالية':<>Book<br/>an event</>}</span>
    </button>
    <EventOrderAside auth={auth} ar={ar} user={user} token={token} open={panelOpen} onCollapse={()=>setPanelOpen(false)}/>
  </>,document.body)}</Context.Provider>;
}

function EventOrderAside({ar,user,token,open,onCollapse,auth}){
  const ctx=useEventOrder();
  const saveMessages={
    deleted:ar?'تم حذف المسودة':'Draft deleted.',
    'review-blocked':ar?'اسمح بفتح تبويب جديد للمراجعة.':'Allow a new browser tab to review your draft.',
    'account-saved':ar?'حُفظت المسودة في حسابك — متاحة في لوحة العميل':'Draft saved to your account · available in your dashboard',
    saving:ar?'جارٍ الحفظ في حسابك…':'Saving to your account…',
    loading:ar?'جارٍ تحميل مسودة حسابك…':'Loading your account draft…',
    'load-failed':ar?'تعذر تحميل مسودة الحساب. لم يتم تغييرها.':'Could not load your account draft. It has not been overwritten.',
    'account-failed':ar?'لم يتم الحفظ في الحساب. أعد المحاولة.':'Not saved to your account. Please retry.',
    conflict:ar?'تغيرت المسودة على جهاز آخر. أعد تحميلها قبل الحفظ.':'Draft changed elsewhere. Reload before saving; your local backup is kept.',
    'local-saved':ar?'نسخة محلية فقط — سجّل الدخول لحفظها في حسابك':'Local backup only · sign in to save to your account',
    failed:ar?'تعذر الحفظ. أبقِ الصفحة مفتوحة.':'Could not save. Keep this page open.',
  };
  return <aside id="event-order-panel" hidden={!open} className="event-order-aside" aria-label={ar?'تفاصيل فعاليتك':'Your event order'} dir={ar?'rtl':'ltr'}>
    <button className="event-order-collapse" type="button" aria-expanded={true} aria-controls="event-order-panel" aria-label={ar?'إغلاق لوحة الطلب':'Close live order panel'} onClick={onCollapse}><X size={16}/></button>
    <div className="event-order-aside-content">

    {user&&token?<><div className="event-order-columns">
    <div className="event-order-conversation">
    <div className="event-order-assistant"><AIBookingPanel key={ctx.revision} ar={ar} user={user} token={token} onReview={ctx.reviewInNewTab}/></div>
    </div>
    </div>
    <footer><div className="event-order-saved-draft"><small role="status">{saveMessages[ctx.saveState]||(ctx.active?(ar?'جارٍ تحديث المسودة':'Updating draft…'):(ar?'ابدأ المحادثة لإنشاء مسودة فعاليتك.':'Start a conversation to create your event draft.'))}</small>{ctx.active&&<button className="event-order-draft-link" type="button" disabled={!ctx.cloudReady||ctx.clearing} onClick={ctx.reviewInNewTab} aria-label={ar?'مراجعة المسودة في تبويب جديد':'Review draft in a new tab'}>{ar?'المسودة':'DRAFT'}<ChevronRight size={15}/></button>}</div>{['load-failed','account-failed'].includes(ctx.saveState)&&<button type="button" onClick={ctx.saveState==='load-failed'?ctx.retrySync:ctx.save}>{ar?'إعادة المحاولة':'Retry account save'}</button>}</footer>
    </>:<OrderSignIn ar={ar} auth={auth}/>}
    </div>
  </aside>;
}
