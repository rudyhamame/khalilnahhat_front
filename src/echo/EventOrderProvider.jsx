import { useEffect, useMemo, useRef, useState } from 'react';
import {createPortal} from 'react-dom';
import { ClipboardList, X, Check, ChevronRight } from 'lucide-react';
import { useCart,restoreOrderCart } from './cart';
import {apiRequest} from '../lib/api';
import {accountEventDraft} from '../lib/accountEventDraft';
import { contract, createEventOrder, normalizeEventOrder, updateOrderField, applyOrderPatch, legacyToOrder, missingOrderFields, getPath, isAnswered } from '../lib/eventOrderCore.mjs';
import './eventOrder.css';
import {EventOrderContext as Context,useEventOrder} from './eventOrderContext';
import AIBookingPanel from './AIBookingPanel';

const ownerKey=user=>`echo-event-order:v1:${user?.id||user?._id||user?.username||'guest'}`;
function initialState(user){
  let order=createEventOrder(),active=false;
  try{
    let saved=localStorage.getItem(ownerKey(user));
    if(user&&sessionStorage.getItem('echo-order-transfer')==='yes'){
      saved ||= localStorage.getItem(ownerKey(null));sessionStorage.removeItem('echo-order-transfer');
    }
    if(saved){order=normalizeEventOrder(JSON.parse(saved));active=true;}
    else {const legacy=JSON.parse(localStorage.getItem(`echo-quote-draft:${user?.id||user?._id||'guest'}`)||'null');if(legacy?.form){order=legacyToOrder(order,legacy.form);active=true;}}
  }catch{/* A corrupt or unavailable local draft must not block booking. */}
  if(user){order.customer.fullName=`${user.firstName||''} ${user.lastName||''}`.trim()||null;order.customer.email=user.email||null;order.customer.phone ||= user.phoneNumber||null;}
  return {order,active};
}

export function EventOrderProvider({user,token,lang,children}){
  const [initial]=useState(()=>initialState(user));
  const [panelOpen,setPanelOpen]=useState(false);
  const [cloudReady,setCloudReady]=useState(false);
  const [loadRetry,setLoadRetry]=useState(0);
  const cloud=useRef(null),edited=useRef(false);
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
    const openBooking=()=>{if(['#how-to-book','#event-order'].includes(window.location.hash)){setPanelOpen(true);setActive(true);setStored(current=>({...current,source:'ai'}));}};
    window.addEventListener('hashchange',openBooking);
    return()=>window.removeEventListener('hashchange',openBooking);
  },[]);
  useEffect(()=>{document.documentElement.classList.toggle('echo-order-open',panelOpen);return()=>document.documentElement.classList.remove('echo-order-open');},[panelOpen]);
  useEffect(()=>{
    if(!active)return;
    const timer=setTimeout(()=>{
      try{localStorage.setItem(ownerKey(user),JSON.stringify(order));if(!user)setSaveState('local-saved');}catch{if(!user)setSaveState('failed');}
      if(user&&cloudReady)cloud.current?.save(order);
    },400);
    return()=>clearTimeout(timer);
  },[order,active,user,cloudReady]);
  const begin=(source='manual',legacy)=>{
    if(legacy&&Object.keys(legacy).length)edited.current=true;
    setPanelOpen(true);
    if(!active)setRevision(value=>value+1);
    setActive(true);setStored(current=>({...legacyToOrder(current,legacy),source}));
  };
  const openEditor=()=>{setPanelOpen(true);setActive(true);setEditorOpen(true);requestAnimationFrame(()=>document.getElementById('event-order-form')?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'}));};
  const save=()=>{try{localStorage.setItem(ownerKey(user),JSON.stringify(order));if(user&&cloudReady)cloud.current?.save(order);else if(!user)setSaveState('local-saved');return true;}catch{if(!user)setSaveState('failed');return false;}};
  const blankProfile=()=>{const blank=createEventOrder();if(user){blank.customer.fullName=`${user.firstName||''} ${user.lastName||''}`.trim()||null;blank.customer.email=user.email||null;blank.customer.phone=user.phoneNumber||null;}return blank;};
  const finish=()=>{setActive(false);cloud.current?.remove();setStored(blankProfile());try{localStorage.removeItem(ownerKey(user));localStorage.removeItem(`echo-quote-draft:${user?.id||user?._id||'guest'}`);}catch{/* Optional storage. */}};
  const clear=()=>{edited.current=true;setStored(blankProfile());restoreOrderCart([]);setSaveState('');try{localStorage.removeItem(ownerKey(user));}catch{/* Optional storage. */}};
  const value={order,active,editorOpen,revision,begin,openEditor,closeEditor:()=>setEditorOpen(false),setField:(path,val)=>{edited.current=true;setStored(current=>updateOrderField(current,path,val));},patchAi:patch=>{edited.current=true;setActive(true);setStored(current=>applyOrderPatch(current,patch));},applyLegacy:draft=>{edited.current=true;setStored(current=>legacyToOrder(current,draft));},save,saveState,clear,finish,retrySync:()=>setLoadRetry(value=>value+1)};
  return <Context.Provider value={value}><div className={`event-order-layout${panelOpen?' is-ordering':''}`}><div className="event-order-main">{children}</div></div>{typeof document!=='undefined'&&createPortal(<>
    {!panelOpen&&<button className="event-order-launcher" type="button" aria-expanded={false} aria-controls="event-order-panel" onClick={()=>{setPanelOpen(true);setActive(true);}}><ClipboardList size={20}/><span><small>ECHO / LIVE ORDER</small><strong>{ar?'تفاصيل فعاليتك':'Your event, taking shape.'}</strong></span><ChevronRight size={18}/></button>}
    <EventOrderAside ar={ar} user={user} token={token} open={panelOpen} onCollapse={()=>setPanelOpen(false)}/>
  </>,document.body)}</Context.Provider>;
}

function EventOrderAside({ar,user,token,open,onCollapse}){
  const ctx=useEventOrder(),{order}=ctx;
  const [json,setJson]=useState(false);
  const missing=missingOrderFields(order);
  const required=contract.sections.filter(section=>!section.gate||getPath(order,section.gate)===true).flatMap(section=>section.fields.filter(field=>field.required));
  const saveMessages={
    'account-saved':ar?'حُفظت المسودة في حسابك — متاحة في لوحة العميل':'Draft saved to your account · available in your dashboard',
    saving:ar?'جارٍ الحفظ في حسابك…':'Saving to your account…',
    loading:ar?'جارٍ تحميل مسودة حسابك…':'Loading your account draft…',
    'load-failed':ar?'تعذر تحميل مسودة الحساب. لم يتم تغييرها.':'Could not load your account draft. It has not been overwritten.',
    'account-failed':ar?'لم يتم الحفظ في الحساب. أعد المحاولة.':'Not saved to your account. Please retry.',
    conflict:ar?'تغيرت المسودة على جهاز آخر. أعد تحميلها قبل الحفظ.':'Draft changed elsewhere. Reload before saving; your local backup is kept.',
    'local-saved':ar?'نسخة محلية فقط — سجّل الدخول لحفظها في حسابك':'Local backup only · sign in to save to your account',
    failed:ar?'تعذر الحفظ. أبقِ الصفحة مفتوحة.':'Could not save. Keep this page open.',
  };
  return <aside id="event-order-panel" hidden={!open} className="event-order-aside" aria-labelledby="event-order-aside-title" dir={ar?'rtl':'ltr'}>
    <header><div><span>ECHO / LIVE ORDER</span><h2 id="event-order-aside-title">{ar?'تفاصيل فعاليتك':'Your event, taking shape.'}</h2></div><button className="event-order-collapse" type="button" aria-expanded={true} aria-controls="event-order-panel" aria-label={ar?'إغلاق لوحة الطلب':'Close live order panel'} onClick={onCollapse}><X size={20}/></button></header>
    <div className="event-order-columns">
    <div className="event-order-conversation">
    <div className="event-order-assistant"><AIBookingPanel ar={ar} user={user} token={token} onReview={ctx.openEditor}/></div>
    <p className="event-order-disclaimer">{ar?'مسودة فقط — لا يُرسل طلب ولا يُحجز موعد قبل المراجعة والإرسال.':'Draft only. Nothing is submitted or reserved until you review and send your request.'}</p>
    </div>
    <section className="event-order-details" aria-label={ar?'الحقول المطلوبة':'Required details'}>
    <div className="event-order-progress"><span>{ar?'الحقول المطلوبة':'Required details'}</span><strong>{required.length-missing.length} / {required.length}</strong><progress max={required.length||1} value={required.length-missing.length}/></div>
    <div className="event-order-aside-body">
      {contract.sections.filter(section=>!section.gate||getPath(order,section.gate)===true).map(section=>{
        const answered=section.fields.filter(field=>isAnswered(getPath(order,field.key)));
        return <details key={section.id} open={['event','customer'].includes(section.id)}><summary>{ar?section.ar:section.title}<small>{answered.length}/{section.fields.length}</small></summary><dl>{section.fields.map(field=>{
          const val=getPath(order,field.key),filled=isAnswered(val);
          return <div key={field.key} className={filled?'is-filled':''}><dt>{ar?field.ar:field.label}{field.required?' *':''}</dt><dd>{filled?<>{Array.isArray(val)?val.map(text=>String(text).replaceAll('_',' ')).join(', '):typeof val==='boolean'?(val?(ar?'نعم':'Yes'):(ar?'لا':'No')):String(val)}<Check size={12}/></>:<span>{ar?'لم يُحدد بعد':'Not provided yet'}</span>}</dd></div>;
        })}</dl></details>;
      })}
      <details open={order.equipment.length>0}><summary>{ar?'المعدات':'Equipment'}<small>{order.equipment.length}</small></summary>{order.equipment.length?<ul>{order.equipment.map(item=><li key={item.id}>{item.quantity} × {item.name}</li>)}</ul>:<p>{ar?'لم تُحدد معدات بعد':'No equipment selected yet.'}</p>}</details>
      <details><summary>{ar?'بعد تأكيد الحجز':'After booking confirmation'}</summary><p>{ar?'البرنامج النهائي والرقصات وقوائم الأغاني تُستكمل في مساحة العميل بعد التأكيد.':'The final timeline, dances, must-play and do-not-play selections remain in Client Workspace planning after confirmation.'}</p></details>
      <button className="event-order-json-toggle" type="button" aria-expanded={json} onClick={()=>setJson(value=>!value)}>{json?(ar?'إخفاء JSON':'Hide order JSON'):(ar?'عرض JSON المباشر':'View live order JSON')}</button>
      {json&&<pre className="event-order-json" aria-label="Live event order JSON">{JSON.stringify(order,null,2)}</pre>}
    </div>
    </section>
    </div>
    <footer><small role="status">{saveMessages[ctx.saveState]||(ar?'جارٍ تحديث المسودة':'Updating draft…')}</small>{['load-failed','account-failed'].includes(ctx.saveState)&&<button type="button" onClick={ctx.saveState==='load-failed'?ctx.retrySync:ctx.save}>{ar?'إعادة المحاولة':'Retry account save'}</button>}<button type="button" onClick={ctx.openEditor}>{ar?'مراجعة وإكمال الطلب':'Review & complete order'}<ChevronRight size={16}/></button><button className="event-order-dismiss" type="button" onClick={ctx.closeEditor}><X size={13}/>{ar?'إخفاء النموذج (المسودة محفوظة)':'Close form (keep draft)'}</button></footer>
  </aside>;
}
