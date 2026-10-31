import {equipmentQuantity} from './simulationLayout';
import OrderSignIn from './OrderSignIn';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import { X } from 'lucide-react';
import { useCart,restoreOrderCart,setCartItem } from './cart';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {accountEventDraft} from '../lib/accountEventDraft';
import { createEventOrder, normalizeEventOrder, updateOrderField, applyOrderPatch, legacyToOrder, missingOrderFields } from '../lib/eventOrderCore.mjs';
import './eventOrder.css';
import './orderAsideUI.css';
import {EventOrderContext as Context,useEventOrder} from './eventOrderContext';
import AIBookingPanel from './AIBookingPanel';

const ownerKey=user=>`echo-event-order:v1:${user?.id||user?._id||user?.username||'guest'}`;
const draftIdKey=user=>`${ownerKey(user)}:draft-id`;
function initialDraftId(user){
  try{const id=localStorage.getItem(draftIdKey(user));if(id&&/^[0-9a-f-]{36}$/i.test(id))return id;}catch{/* Storage is optional. */}
  return crypto.randomUUID();
}
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

export function EventOrderProvider({user,token,lang,children,auth,isSessionReady,onCreateServiceRequest}){
  const [initial]=useState(()=>initialState(user));
  // Start open when the URL asks for it: the provider remounts when the session resolves (key change), and a closed first state made the panel close and reopen.
  const [panelOpen,setPanelOpen]=useState(()=>typeof window!=='undefined'&&(['#how-to-book','#event-order'].includes(window.location.hash)||new URLSearchParams(window.location.search).get('resumeOrder')==='1'));
  const [cloudReady,setCloudReady]=useState(false);
  const [draftId,setDraftId]=useState(()=>initialDraftId(user));
  const [loadRetry,setLoadRetry]=useState(0);
  const cloud=useRef(null),edited=useRef(false),deleting=useRef(false);
  const [clearing,setClearing]=useState(false);
  const [stored,setStored]=useState(initial.order),[active,setActive]=useState(initial.active),[editorOpen,setEditorOpen]=useState(false),[revision,setRevision]=useState(0),[saveState,setSaveState]=useState('');
  const cart=useCart();
  const order=useMemo(()=>({...stored,equipment:Object.values(cart).map(item=>({id:item.id,name:item.name,quantity:item.quantity}))}),[stored,cart]);
  // The header's Book an event button shows how many booking drafts still need completing (the account has one draft).
  const draftsToComplete=user&&token&&active&&missingOrderFields(order).length>0?1:0;
  useEffect(()=>{window.__echoBookingDrafts=draftsToComplete;window.dispatchEvent(new CustomEvent('echo:booking-drafts',{detail:draftsToComplete}));return()=>{window.__echoBookingDrafts=0;window.dispatchEvent(new CustomEvent('echo:booking-drafts',{detail:0}));};},[draftsToComplete]);
  const ar=lang.lang==='ar';
  useEffect(()=>{
    if(!user||!token){setCloudReady(false);return;}
    let alive=true;edited.current=false;setSaveState('loading');setCloudReady(false);
    const client=accountEventDraft((path,options)=>apiRequest(path,{...options,token}),setSaveState);cloud.current=client;
    client.load().then(item=>{
      if(!alive)return;
      if(item&&edited.current){client.block();return;}
      if(item){if(item.draftId)setDraftId(item.draftId);setStored(normalizeEventOrder(item.order));restoreOrderCart(item.order.equipment||[]);setActive(true);setSaveState('account-saved');}
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
  useEffect(()=>{
    const url=new URL(window.location.href);
    if(url.searchParams.has('resumeOrder')||url.hash==='#how-to-book'){
      url.searchParams.delete('resumeOrder');url.hash='event-order';
      window.history.replaceState(window.history.state,'',url.pathname+url.search+url.hash);
    }
  },[]);
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
      if(user&&cloudReady&&!deleting.current)cloud.current?.save(order,draftId);
    },400);
    return()=>clearTimeout(timer);
  },[order,active,user,token,cloudReady,draftId]);
  useEffect(()=>{try{localStorage.setItem(draftIdKey(user),draftId);}catch{/* Cloud draft remains authoritative when storage is unavailable. */}},[user,draftId]);
  const begin=(source='manual',legacy)=>{
    if(deleting.current)return;
    if(!user||!token){setPanelOpen(true);return;}
    if(legacy&&Object.keys(legacy).length)edited.current=true;
    setPanelOpen(true);
    if(!active)setRevision(value=>value+1);
    setActive(true);setStored(current=>({...legacyToOrder(current,legacy),source}));
  };
  const openEditor=()=>{setPanelOpen(true);if(!user||!token)return;setActive(true);setEditorOpen(true);requestAnimationFrame(()=>window.dispatchEvent(new Event('echo:booking-review')));};
  const save=async()=>{
    if(!active||!user||!token||!cloudReady||deleting.current)return false;
    try{localStorage.setItem(ownerKey(user),JSON.stringify(order));}catch{/* Account save can still succeed without local storage. */}
    return await cloud.current?.save(order,draftId) || false;
  };
  const reviewDraft=()=>{
    setPanelOpen(true);
    requestAnimationFrame(()=>window.dispatchEvent(new Event('echo:booking-review')));
  };
  const blankProfile=()=>{const blank=createEventOrder();if(user){blank.customer.fullName=`${user.firstName||''} ${user.lastName||''}`.trim()||null;blank.customer.email=user.email||null;blank.customer.phone=user.phoneNumber||null;}return blank;};
  const finish=()=>{setActive(false);cloud.current?.remove();setDraftId(crypto.randomUUID());setStored(blankProfile());try{localStorage.removeItem(ownerKey(user));localStorage.removeItem(`echo-quote-draft:${user?.id||user?._id||'guest'}`);}catch{/* Optional storage. */}};
  const clear=async()=>{
    if(!user||!token||!cloudReady||deleting.current)return false;
    deleting.current=true;setClearing(true);
    const removed=await cloud.current?.remove();
    if(!removed){deleting.current=false;setClearing(false);return false;}
    edited.current=true;setActive(false);setEditorOpen(false);setStored(blankProfile());restoreOrderCart([]);setDraftId(crypto.randomUUID());setRevision(value=>value+1);setSaveState('deleted');
    try{localStorage.removeItem(ownerKey(user));localStorage.removeItem(`echo-quote-draft:${user?.id||user?._id||'guest'}`);}catch{/* Optional storage. */}
    deleting.current=false;setClearing(false);return true;
  };
  const venueIntelligence={
    owner:user?.id||user?._id||null,
    request:(path,options={})=>{if(!user||!token){setPanelOpen(true);return Promise.reject(new Error('Sign in to research and save venues.'));}return apiRequest('/ai-booking/venue-intelligence'+path,{...options,token});},
    tile:async(z,x,y,signal)=>{const response=await fetch(`${apiBaseUrl}/ai-booking/venue-intelligence/tiles/${z}/${x}/${y}`,{headers:{Authorization:`Bearer ${token}`},signal});if(!response.ok)throw new Error('Satellite imagery could not be loaded.');return response.blob();},
  };
  const value={user,lang,isSessionReady,onCreateServiceRequest,token,signedIn:Boolean(user&&token),venueIntelligence,requestSetupAdvice:body=>{if(!user||!token){setPanelOpen(true);return Promise.reject(new Error('Sign in to ask Echo for setup advice.'));}return apiRequest('/ai-booking/setup-advice',{method:'POST',token,body});},requestVenueArea:body=>{if(!user||!token){setPanelOpen(true);return Promise.reject(new Error('Sign in to estimate your venue area.'));}return apiRequest('/ai-booking/venue-area',{method:'POST',token,body});},setEquipment:(item,quantity)=>{if(!user||!token){setPanelOpen(true);return;}if(deleting.current)return;edited.current=true;setActive(true);setCartItem(item,equipmentQuantity(item,quantity));},order,active,panelOpen,cloudReady,clearing,draftId,reviewDraft,editorOpen,revision,begin,openEditor,closeEditor:()=>setEditorOpen(false),setField:(path,val)=>{if(!user||!token||deleting.current)return;edited.current=true;setActive(true);setStored(current=>updateOrderField(current,path,val));},patchAi:patch=>{if(!user||!token||deleting.current)return;edited.current=true;setActive(true);setStored(current=>applyOrderPatch(current,patch));},applyLegacy:draft=>{if(!user||!token||deleting.current)return;edited.current=true;setStored(current=>legacyToOrder(current,draft));},save,saveState,clear,finish,retrySync:()=>setLoadRetry(value=>value+1)};
  useEffect(()=>{const open=()=>setPanelOpen(true);window.addEventListener('echo:book-event',open);return()=>window.removeEventListener('echo:book-event',open);},[]);
  return <Context.Provider value={value}><div className={`event-order-layout${panelOpen?' is-ordering':''}`}><div className="event-order-main">{children}</div></div>{typeof document!=='undefined'&&createPortal(<>
    <EventOrderAside auth={auth} ar={ar} user={user} token={token} open={panelOpen} onCollapse={()=>setPanelOpen(false)}/>
  </>,document.body)}</Context.Provider>;
}

function EventOrderAside({ar,user,token,open,onCollapse,auth}){
  const ctx=useEventOrder();
  return <aside id="event-order-panel" hidden={!open} className="event-order-aside" aria-label={ar?'تفاصيل فعاليتك':'Your event order'} dir={ar?'rtl':'ltr'}>
    <button className="event-order-collapse" type="button" aria-expanded={true} aria-controls="event-order-panel" aria-label={ar?'إغلاق لوحة الطلب':'Close live order panel'} onClick={onCollapse}><X size={16}/></button>
    <div className="event-order-aside-content">

    {user&&token?<><div className="event-order-columns">
    <div className="event-order-conversation">
    <div className="event-order-assistant"><AIBookingPanel key={`${ctx.revision}:${ctx.draftId}`} ar={ar} user={user} token={token} draftId={ctx.draftId} onReview={ctx.reviewDraft} onClose={onCollapse}/></div>
    </div>
    </div>

    </>:<OrderSignIn ar={ar} auth={auth}/>}
    </div>
  </aside>;
}
