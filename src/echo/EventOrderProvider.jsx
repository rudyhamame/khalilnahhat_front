import {confirmDeletion} from '../lib/confirmDeletion';
import {scrollToAppSection} from '../lib/bookingViewport';
import {prepareBookingDraftEdit} from '../lib/bookingDraftEdits';
import {resolveDraftEquipment} from '../lib/draftEquipment';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {equipmentBookingServiceId,equipmentBelongsToService} from '../lib/rentalCatalog';
import {equipmentQuantity} from './simulationLayout';
import OrderSignIn from './OrderSignIn';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useCart,restoreOrderCart,readCart } from './cart';
import {apiRequest,apiBaseUrl} from '../lib/api';
import {accountEventDraft} from '../lib/accountEventDraft';
import {mergeGuestDraft} from '../lib/mergeGuestDraft.mjs';
import {aiTaskHistoryKey} from '../lib/aiTaskHistory';
import { trackOnce, setFunnelStep, installDropOffTracking } from '../lib/analytics';
import { createEventOrder, normalizeEventOrder, fields, getPath, legacyToOrder, missingOrderFields,hasEventDraftContent } from '../lib/eventOrderCore.mjs';
import './eventOrder.css';
import './orderAsideUI.css';
import './eventOrderInline.css';
import {EventOrderContext as Context,useEventOrder} from './eventOrderContext';
import AIBookingPanel from './AIBookingPanel';

const ownerKey=user=>`echo-event-order:v1:${user?.id||user?._id||user?.username||'guest'}`;
const draftIdKey=user=>`${ownerKey(user)}:draft-id`;
function createDraftId(){
  if(typeof globalThis.crypto?.randomUUID==='function')return globalThis.crypto.randomUUID();
  const bytes=new Uint8Array(16);
  globalThis.crypto.getRandomValues(bytes);
  bytes[6]=(bytes[6]&0x0f)|0x40;
  bytes[8]=(bytes[8]&0x3f)|0x80;
  const hex=Array.from(bytes,value=>value.toString(16).padStart(2,'0')).join('');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}
function initialDraftId(user){
  try{const id=localStorage.getItem(draftIdKey(user));if(id&&/^[0-9a-f-]{36}$/i.test(id))return id;}catch{/* Storage is optional. */}
  return createDraftId();
}
function initialState(user){
  // Without an account the draft lives in this browser until the visitor signs in or signs up.
  let order=createEventOrder(),active=false;
  try{
    let saved=localStorage.getItem(ownerKey(user));
    if(saved){order=normalizeEventOrder(JSON.parse(saved));active=true;}
    else {const legacy=JSON.parse(localStorage.getItem(`echo-quote-draft:${user?.id||user?._id||'guest'}`)||'null');if(legacy?.form){order=legacyToOrder(order,legacy.form);active=true;}}
  }catch{/* A corrupt or unavailable local draft must not block booking. */}
  if(user){order.customer.fullName=`${user.firstName||''} ${user.lastName||''}`.trim()||null;order.customer.email=user.email||null;order.customer.phone ||= user.phoneNumber||null;}
  return {order,active};
}

export function EventOrderProvider({user,token,lang,children,isSessionReady,onCreateServiceRequest,frameless=false}){
  const [initial]=useState(()=>initialState(user));
  const [panelOpen,setPanelOpen]=useState(true);
  const assistantAvailable=true;
  const [assistantRequest,setAssistantRequest]=useState(0);
  const [rentalServiceId,setRentalServiceId]=useState('');
  const [lastSubmission,setLastSubmission]=useState(null);
  const [aiVenueSearch,setAiVenueSearch]=useState(null),aiVenueChoice=useRef(null);
  const assistantSession=useRef({draftId:null,started:false,allowDraftChoice:false});
  const [cloudReady,setCloudReady]=useState(false);
  const [recentEdits,setRecentEdits]=useState([]);
  const [draftId,setDraftId]=useState(()=>initialDraftId(user));
  const [loadRetry,setLoadRetry]=useState(0);
  const cloud=useRef(null),edited=useRef(false),deleting=useRef(false),conversationSaver=useRef(null);
  const [clearing,setClearing]=useState(false),[resetVersion,setResetVersion]=useState(0);
  const resetPageSelections=()=>{
    try{sessionStorage.removeItem('echo-availability-flipped');}catch{/* Optional per-tab state. */}
    setResetVersion(value=>value+1);
  };
  const [stored,setStoredState]=useState(initial.order),[active,setActive]=useState(initial.active),[editorOpen,setEditorOpen]=useState(false),[revision,setRevision]=useState(0),[saveState,setSaveState]=useState('');
  const storedRef=useRef(initial.order);
  const setStored=update=>{const next=typeof update==='function'?update(storedRef.current):update;storedRef.current=next;setStoredState(next);};
  const getOrder=()=>({...storedRef.current,equipment:Object.values(readCart()).map(({id,name,quantity})=>({id,name,quantity}))});
  const cart=useCart();
  const {catalog,equipment}=useRentalCatalog();
  useLayoutEffect(()=>{restoreOrderCart(initial.order.equipment||[]);},[initial]);
  const order=useMemo(()=>({...stored,equipment:Object.values(cart).map(item=>({id:item.id,name:item.name,quantity:item.quantity}))}),[stored,cart]);
  // The header's Book an event button shows how many booking drafts still need completing (the account has one draft).
  const draftsToComplete=user&&token&&active&&hasEventDraftContent(order)&&missingOrderFields(order).length>0?1:0;
  // Funnel events: the event details complete, the personal details complete, and where a visitor stopped if they leave.
  useEffect(()=>{
    if(!hasEventDraftContent(order))return;
    const missing=missingOrderFields(order).map(field=>field.key);
    const eventLeft=missing.filter(key=>key.startsWith('event.')).length,personalLeft=missing.filter(key=>key.startsWith('customer.')).length;
    setFunnelStep(eventLeft?'event_info':personalLeft?'personal_info':'review');
    if(!eventLeft)trackOnce('event_info_complete');
    if(!personalLeft)trackOnce('personal_info_complete');
  },[order]);
  useEffect(()=>installDropOffTracking(),[]);
  useEffect(()=>{window.__echoBookingDrafts=draftsToComplete;window.dispatchEvent(new CustomEvent('echo:booking-drafts',{detail:draftsToComplete}));return()=>{window.__echoBookingDrafts=0;window.dispatchEvent(new CustomEvent('echo:booking-drafts',{detail:0}));};},[draftsToComplete]);
  const ar=lang.lang==='ar';
  useEffect(()=>{
    if(!user||!token){setCloudReady(true);setSaveState('');return;}
    let alive=true;edited.current=false;setSaveState('loading');setCloudReady(false);
    const client=accountEventDraft((path,options)=>apiRequest(path,{...options,token}),setSaveState);cloud.current=client;
    client.load().then(item=>{
      if(!alive)return;
      if(item&&edited.current){if(item.draftId)setDraftId(item.draftId);client.block();setCloudReady(true);return;}
      // Details entered as a guest before signing in or signing up are merged into the account draft.
      let guestDraft=null;try{const raw=localStorage.getItem(ownerKey(null));if(raw){const parsed=normalizeEventOrder(JSON.parse(raw));if(hasEventDraftContent(parsed)||parsed.equipment?.length)guestDraft=parsed;}}catch{/* An unreadable guest draft is ignored. */}
      if(item){
        if(item.draftId)setDraftId(item.draftId);
        const merged=guestDraft?mergeGuestDraft(normalizeEventOrder(item.order),guestDraft):normalizeEventOrder(item.order);
        setStored(merged);restoreOrderCart(merged.equipment||[]);setActive(true);setSaveState(guestDraft?'pending':'account-saved');
        if(guestDraft)try{localStorage.removeItem(ownerKey(null));}catch{/* Optional storage. */}
      }
      else if(guestDraft){
        const merged=mergeGuestDraft(blankProfile(),guestDraft);
        setStored(merged);restoreOrderCart(merged.equipment||[]);setActive(true);setSaveState('pending');
        try{localStorage.removeItem(ownerKey(null));}catch{/* Optional storage. */}
      }
      else {
        if(!edited.current){setStored(blankProfile());restoreOrderCart([]);setActive(false);setDraftId(crypto.randomUUID());try{localStorage.removeItem(ownerKey(user));localStorage.removeItem(`echo-quote-draft:${user?.id||user?._id||'guest'}`);}catch{}}
        setSaveState('');
      }
      setCloudReady(true);
      if(new URLSearchParams(window.location.search).get('resumeOrder')==='1')setPanelOpen(true);
    }).catch(()=>{if(alive)setSaveState('load-failed');});
    return()=>{alive=false;client.dispose();if(cloud.current===client)cloud.current=null;};
  },[user,token,loadRetry]);
  useEffect(()=>{
    const openBooking=()=>{if(['#how-to-book','#event-order'].includes(window.location.hash)){setPanelOpen(true);requestAnimationFrame(()=>scrollToAppSection('assistant'));}};
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
  useEffect(()=>{
    if(!active||deleting.current)return;
    const timer=setTimeout(()=>{
      const guest=!user||!token;
      try{localStorage.setItem(ownerKey(user),JSON.stringify(order));if(guest)setSaveState('local-saved');}catch{if(guest)setSaveState('failed');}
      if(!guest&&cloudReady&&!deleting.current)cloud.current?.save(order,draftId);
    },400);
    return()=>clearTimeout(timer);
  },[order,active,user,token,cloudReady,draftId]);
  useEffect(()=>{try{localStorage.setItem(draftIdKey(user),draftId);}catch{/* Cloud draft remains authoritative when storage is unavailable. */}},[user,draftId]);
  const begin=(source='manual',legacy)=>{
    if(deleting.current)return;
    if(!user||!token){setPanelOpen(true);return;}
    setPanelOpen(true);
    // draftId already resets the assistant after deletion. Starting the new
    // draft must not unmount the very chat request or call that starts it.
    if(legacy&&Object.keys(legacy).length)applyLegacy(legacy,{source});
    else if(cloudReady)setActive(true);
  };
  const openEditor=()=>{requestAnimationFrame(()=>scrollToAppSection('assistant'));setPanelOpen(true);if(!user||!token)return;setActive(true);setEditorOpen(true);requestAnimationFrame(()=>window.dispatchEvent(new Event('echo:booking-review')));};
  const persistOrder=async snapshot=>{
    if(!user||!token||!cloudReady||deleting.current)return false;
    try{localStorage.setItem(ownerKey(user),JSON.stringify(snapshot));}catch{/* Account save remains authoritative. */}
    return await cloud.current?.save(snapshot,draftId)||false;
  };
  const save=(snapshot=getOrder())=>persistOrder(snapshot);
  const reviewDraft=()=>{
    requestAnimationFrame(()=>scrollToAppSection('assistant'));
    setPanelOpen(true);
    requestAnimationFrame(()=>window.dispatchEvent(new Event('echo:booking-review')));
  };
  const blankProfile=()=>{const blank=createEventOrder();if(user){blank.customer.fullName=`${user.firstName||''} ${user.lastName||''}`.trim()||null;blank.customer.email=user.email||null;blank.customer.phone=user.phoneNumber||null;}return blank;};
  const finish=async receipt=>{
    setLastSubmission({reference:receipt,cleaning:true});
    const cleared=await clear(true);
    setLastSubmission({reference:receipt,cleaning:false,cleared});
    return cleared;
  };
  const clear=async(confirmed=false)=>{
    if(deleting.current)return false;
    // A guest's draft only lives in this browser: deleting it clears that copy.
    if(!user||!token){
      if(!confirmed&&!await confirmDeletion('Delete this booking draft permanently?'))return false;
      edited.current=true;setActive(false);setEditorOpen(false);setStored(blankProfile());restoreOrderCart([]);setDraftId(crypto.randomUUID());setRevision(value=>value+1);setRecentEdits([]);setSaveState('deleted');resetPageSelections();
      try{localStorage.removeItem('echo-quote-draft:guest');}catch{/* Optional storage. */}
      return true;
    }
    if(!cloudReady)return false;
    if(!confirmed&&!await confirmDeletion('Delete this booking draft and its conversation permanently?'))return false;
    deleting.current=true;setClearing(true);
    const removed=await cloud.current?.remove({draftId});
    if(!removed){deleting.current=false;setClearing(false);return false;}
    edited.current=true;setActive(false);setEditorOpen(false);setStored(blankProfile());restoreOrderCart([]);const nextDraftId=crypto.randomUUID();setDraftId(nextDraftId);setRevision(value=>value+1);setRecentEdits([]);setSaveState('deleted');resetPageSelections();
    try{localStorage.removeItem(ownerKey(user));localStorage.removeItem(`echo-quote-draft:${user?.id||user?._id||'guest'}`);const tasksKey=aiTaskHistoryKey(user?.id||user?._id,draftId);if(tasksKey)localStorage.removeItem(tasksKey);}catch{/* Optional storage. */}
    try{localStorage.setItem(`${ownerKey(user)}:reset`,nextDraftId);}catch{/* Other tabs may be unavailable. */}
    deleting.current=false;setClearing(false);return true;
  };
  useEffect(()=>{
    if(!user||!token)return;
    const reset=event=>{
      if(event.key!==`${ownerKey(user)}:reset`||!event.newValue)return;
      cloud.current?.dispose();cloud.current=null;edited.current=false;
      setCloudReady(false);setStored(blankProfile());restoreOrderCart([]);setActive(false);setEditorOpen(false);
      setDraftId(event.newValue);setRevision(value=>value+1);setRecentEdits([]);resetPageSelections();setLoadRetry(value=>value+1);
    };
    window.addEventListener('storage',reset);return()=>window.removeEventListener('storage',reset);
  },[user,token]);
  const venueIntelligence={
    owner:user?.id||user?._id||null,
    request:(path,options={})=>{if(!user||!token){setPanelOpen(true);return Promise.reject(new Error('Sign in to research and save venues.'));}return apiRequest('/ai-booking/venue-intelligence'+path,{...options,token});},
    tile:async(z,x,y,signal)=>{const response=await fetch(`${apiBaseUrl}/ai-booking/venue-intelligence/tiles/${z}/${x}/${y}`,{headers:{Authorization:`Bearer ${token}`},signal});if(!response.ok)throw new Error('Satellite imagery could not be loaded.');return response.blob();},
  };
  // Every manual control, cart edit and AI transport commits through this path.
  const editDraft=(patch,{source='manual'}={})=>{
    const guest=!user||!token;
    if(deleting.current||(!guest&&!cloudReady)||['conflict','delete-conflict'].includes(saveState)){
      if(source==='manual'&&!guest)setPanelOpen(true);
      return {draftUpdated:false,updatedFields:[],rejectedFields:['draft_unavailable']};
    }
    const result=prepareBookingDraftEdit(getOrder(),patch,{catalog,equipment,source});
    if(result.updatedFields.length){
      edited.current=true;setActive(true);setSaveState('pending');setStored(result.order);
      setRecentEdits(current=>[...current,...result.updatedFields.map(({path})=>({path,source,at:new Date().toISOString()}))].slice(-16));
      if(result.equipmentChanged)restoreOrderCart(resolveDraftEquipment(result.order.equipment,equipment));
    }
    return result;
  };
  const setEquipment=(item,quantity)=>{
    const current=equipment.find(row=>row.id===item.id)||item;
    const amount=equipmentQuantity(current,quantity);
    const previous=getOrder().equipment;
    const rows=previous.flatMap(row=>row.id!==item.id?[row]:amount>0?[{id:current.id,name:current.name,quantity:amount}]:[]);
    if(amount>0&&!previous.some(row=>row.id===item.id))rows.push({id:current.id,name:current.name,quantity:amount});
    return editDraft([{path:'equipment',value:rows}]);
  };
  const setField=(path,value)=>{
    if(value!==null&&value!=='')trackOnce('booking_started',{field:path});
    const result=editDraft([{path,value}]);
    if(result.draftUpdated)window.dispatchEvent(new CustomEvent('echo:booking-field-focus',{detail:{path}}));
    return result;
  };
  const removeService=id=>{
    const snapshot=getOrder();
    const services=catalog.filter(row=>row.kind==='service'&&equipmentBookingServiceId(row)===id);
    const linked=equipment.filter(item=>services.some(service=>equipmentBelongsToService(item,service,equipment))).map(item=>item.id);
    const changes=[{path:'equipment',value:snapshot.equipment.filter(item=>!linked.includes(item.id))},{path:'services',value:snapshot.services.filter(value=>value!==id)}];
    if(id==='dj')changes.push({path:'music.djRequested',value:false});
    if(id==='mc')changes.push({path:'music.mcRequested',value:false});
    return editDraft(changes);
  };
  const patchAi=patch=>editDraft(patch,{source:'ai'});
  const commitAi=async patch=>{
    const result=patchAi(patch);
    const saved=result.order&&result.updatedFields.length?await persistOrder(result.order):false;
    return {...result,saved:Boolean(saved)};
  };
  const applyLegacy=(draft,options)=>{
    const snapshot=getOrder();
    const next=legacyToOrder(snapshot,draft);
    const changes=fields
      .filter(field=>JSON.stringify(getPath(next,field.key))!==JSON.stringify(getPath(snapshot,field.key)))
      .map(field=>({path:field.key,value:getPath(next,field.key)}));
    return editDraft(changes,options);
  };
  const registerConversationSaver=saver=>{
    conversationSaver.current=saver;
    return ()=>{if(conversationSaver.current===saver)conversationSaver.current=null;};
  };
  const openAssistant=({source='user'}={})=>{
    requestAnimationFrame(()=>scrollToAppSection('assistant',{source}));
    if(source==='navigation'){
      window.dispatchEvent(new Event('echo:assistant-conversation'));
      if(source!=='viewport')setLastSubmission(null);
      if(!assistantSession.current.started&&!assistantSession.current.greeted)assistantSession.current={draftId,started:false,allowDraftChoice:false};
      setAssistantRequest(value=>value+1);
      setPanelOpen(true);
      return;
    }
    if(source!=='viewport')setLastSubmission(null);
    if(panelOpen&&['viewport','navigation','goal'].includes(source))return;
    assistantSession.current={draftId,started:false,allowDraftChoice:false};
    setAssistantRequest(value=>value+1);
    setPanelOpen(true);
  };
  const requestBookingHelp=(path,body)=>{
    if(!user||!token){
      setPanelOpen(true);
      return Promise.reject(new Error('Sign in to ask Echo for booking help.'));
    }
    return apiRequest(path,{method:'POST',token,body});
  };
  const value={
    user,lang,isSessionReady,onCreateServiceRequest,token,signedIn:Boolean(user&&token),draftEditable:!deleting.current&&cloudReady&&!['conflict','delete-conflict'].includes(saveState),
    order,getOrder,active,cloudReady,clearing,draftId,revision,resetVersion,recentEdits,
    setField,setEquipment,removeService,editDraft,patchAi,commitAi,applyLegacy,
    save,saveState,clear,finish,retrySync:()=>setLoadRetry(value=>value+1),
    panelOpen,assistantAvailable,editorOpen,begin,openEditor,reviewDraft,closeEditor:()=>setEditorOpen(false),
    assistantSession,assistantRequest,openAssistant,closeAssistant:()=>setPanelOpen(false),
    markAssistantConversationStarted:()=>{assistantSession.current={...assistantSession.current,draftId,started:true};},
    registerConversationSaver,flushConversation:()=>conversationSaver.current?.()||Promise.resolve(),
    lastSubmission,dismissSubmission:()=>setLastSubmission(null),
    aiVenueSearch,setAiVenueSearch,aiVenueChoice,rentalServiceId,setRentalServiceId,venueIntelligence,
    requestSetupAdvice:body=>requestBookingHelp('/ai-booking/setup-advice',body),
    requestVenueArea:body=>requestBookingHelp('/ai-booking/venue-area',body),
  };
  // "Book your event" and the voucher ribbon go straight to the booking calendar; the voucher code (if any) is put on the draft.
  const bookRef=useRef(null);bookRef.current=(event)=>{const code=event?.detail?.voucher;if(code&&!deleting.current&&cloudReady)setField('additional.voucherCode',code);requestAnimationFrame(()=>scrollToAppSection('availability',{source:'navigation'}));};
  useEffect(()=>{const open=event=>bookRef.current(event);window.addEventListener('echo:book-event',open);return()=>window.removeEventListener('echo:book-event',open);},[]);
  if(frameless)return <Context.Provider value={value}>{children}</Context.Provider>;
  return <Context.Provider value={value}><div className="event-order-layout event-order-viewport-layout">
    <div className="event-order-main" dir={ar?'rtl':'ltr'}>{children}</div>
  </div></Context.Provider>;
}

export function EventOrderAside({ar,user,token,open=true,auth,workspace=false,selectedGoal,view,onConversation,onBusyChange,headerSlot}){
  const ctx=useEventOrder();
  return <aside id="event-order-panel" hidden={!open} className="event-order-aside" aria-label={ar?'تفاصيل فعاليتك':'Your event order'} dir={ar?'rtl':'ltr'}>
    <div className="event-order-aside-content">

    {user&&token?ctx.lastSubmission?<section className="egb-draft-received" role="status"><h2>{ar?'تم استلام طلب عرض السعر':'Quote request received'}</h2><p><strong>{ctx.lastSubmission.reference}</strong></p><p>{ar?'سيراجع الفريق تفاصيلك ومحادثتك مع إيكو. لم يُحجز الموعد بعد.':'The team will review your details and Echo conversation. Your date is not reserved yet.'}</p>{ctx.lastSubmission.cleaning?<p>{ar?'جارٍ تجهيز مسودة جديدة…':'Preparing a fresh draft…'}</p>:<><a className="echo-btn" href="/dashboard/bookings">{ar?'افتح مساحة العميل':'Open Client Workspace'}</a>{ctx.lastSubmission.cleared?<button type="button" className="echo-link" onClick={ctx.dismissSubmission}>{ar?'خطط لفعالية أخرى':'Plan another event'}</button>:<div><p>{ar?'تعذر حذف المسودة القديمة. يرجى حذفها قبل البدء مجدداً.':'The old draft could not be cleared. Delete it before starting another event.'}</p><button type="button" className="echo-link" onClick={()=>ctx.finish(ctx.lastSubmission.reference)}>{ar?'أعد محاولة حذف المسودة':'Retry draft cleanup'}</button></div>}</>}</section>:<><div className="event-order-columns">
    <div className="event-order-conversation">
    <div className="event-order-assistant"><AIBookingPanel key={`${ctx.revision}:${ctx.draftId}`} ar={ar} user={user} token={token} draftId={ctx.draftId} assistantRequest={ctx.assistantRequest} workspace={workspace} selectedGoal={selectedGoal} view={view} onConversation={onConversation} onBusyChange={onBusyChange} headerSlot={headerSlot} onReview={ctx.reviewDraft}/></div>
    </div>
    </div>

    </>:<OrderSignIn ar={ar} auth={auth}/>}
    </div>
  </aside>;
}
