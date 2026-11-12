import {useEffect,useRef,useState} from 'react';
import {eventTypeLabel} from '../lib/eventTypeLabel';
import {scrollToAppSection} from '../lib/bookingViewport';
import {Sparkles,MessageCircle,Network,ClipboardCheck,CalendarDays,Disc3,Boxes,UserRound,SlidersHorizontal,Check,ArrowUpRight,Box,ArrowDown} from 'lucide-react';
import {EventOrderAside} from './EventOrderProvider';
import {useEventOrder} from './eventOrderContext';
import {BOOKING_GOALS,goalFields,goalProgress,goalValue} from '../lib/bookingGoals';
import {getPath,isAnswered,missingOrderFields} from '../lib/eventOrderCore.mjs';
import './homeBookingAssistant.css';

const icons=[UserRound,CalendarDays,Disc3,Boxes,SlidersHorizontal];
export function BookingConceptMap({order,ar,onSelect}){
 const tr=(en,arabic)=>ar?arabic:en;
 const surface=useRef(null),[fit,setFit]=useState(1),[zoom,setZoom]=useState(1);
 useEffect(()=>{const element=surface.current;if(!element)return;const update=()=>setFit(Math.max(.25,Math.min(1,(element.clientWidth-32)/1000,(element.clientHeight-52)/1000)));const observer=new ResizeObserver(update);observer.observe(element);update();return()=>observer.disconnect();},[]);
 const scale=zoom??fit;
 return <div className="echo-map-surface" ref={surface}><div className="echo-map-zoom" role="group" aria-label={tr('Concept map zoom','تكبير خريطة المفاهيم')}><button type="button" aria-label={tr('Zoom out','تصغير')} onClick={()=>setZoom(Math.max(.25,scale-.15))}>−</button><output>{Math.round(scale*100)}%</output><button type="button" aria-label={tr('Zoom in','تكبير')} onClick={()=>setZoom(Math.min(1.75,scale+.15))}>+</button><button type="button" onClick={()=>setZoom(null)}>{tr('Fit','ملاءمة')}</button></div><div className="echo-booking-map" tabIndex={0} aria-label={tr('Booking concept map. Select a concept to work on it.','خريطة مفاهيم الحجز. اختر مفهوماً للعمل عليه.')}>
  <div className="echo-map-size" style={{width:1000*scale,height:1000*scale}}><div className="echo-booking-graph" style={{transform:`scale(${scale})`}} dir="ltr">
   <svg viewBox="0 0 1000 1000" aria-hidden="true">{BOOKING_GOALS.map((goal,index)=>{const y=68+index*158;return <g key={goal.id} style={{'--goal-color':`var(--goal-${index})`}}><path d={`M 195 500 C 260 500, 260 ${y}, 330 ${y}`}/><path d={`M 525 ${y} C 565 ${y}, 565 ${y}, 605 ${y}`}/><circle cx="330" cy={y} r="4"/><circle cx="605" cy={y} r="4"/></g>;})}</svg>
   <div className="echo-map-root"><Sparkles size={23}/><span>ECHO / {tr('CURRENT DRAFT','المسودة الحالية')}</span><strong>{eventTypeLabel(order.event?.type,ar)||tr('Your event','فعاليتك')}</strong><small>{order.event?.date||tr('Date to be decided','الموعد لم يُحدّد بعد')}</small></div>
   {BOOKING_GOALS.map((goal,index)=>{
    const progress=goalProgress(order,goal),Icon=icons[index];
    const answered=goalFields(goal).filter(field=>isAnswered(getPath(order,field.key)));
    const shown=(answered.length?answered:goalFields(goal).filter(field=>progress.missing.some(item=>item.key===field.key))).slice(0,3);
    return <div key={goal.id} className="echo-map-branch" style={{top:12+index*158,'--goal-color':`var(--goal-${index})`}}>
     <button type="button" className="echo-map-concept" onClick={()=>onSelect(goal.id)}><Icon size={18}/><strong>{ar?goal.ar:goal.title}</strong><span>{progress.missing.length?`${progress.missing.length} ${tr('to complete','متبقي')}`:tr('Ready to review','جاهز للمراجعة')}<ArrowUpRight size={13}/></span></button>
     <button type="button" className="echo-map-values" onClick={()=>onSelect(goal.id)} aria-label={tr(`Work on ${goal.title}`,`العمل على ${goal.ar}`)} dir={ar?'rtl':'ltr'}>
      {shown.map(field=><span key={field.key}><small>{ar?field.ar||field.label:field.label}</small><b>{goalValue(getPath(order,field.key),ar)}</b></span>)}
      {goal.id==='rentals'&&order.equipment?.length>0&&<span><small>{tr('Equipment','المعدات')}</small><b>{goalValue(order.equipment,ar)}</b></span>}
      {!shown.length&&!(goal.id==='rentals'&&order.equipment?.length)&&<span><small>{tr('Optional details','تفاصيل اختيارية')}</small><b>{tr('Add your preferences','أضف تفضيلاتك')}</b></span>}
     </button>
    </div>;
   })}
  </div></div>
 </div></div>;
}
export default function HomeBookingAssistant({lang,user,token,auth}){
 const ctx=useEventOrder(),ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
 const [goal,setGoal]=useState('event'),[view,setView]=useState('conversation'),[busy,setBusy]=useState(false),[headerSlot,setHeaderSlot]=useState(null);
 useEffect(()=>{
  const review=()=>setView('details'),conversation=()=>setView('conversation');
  window.addEventListener('echo:booking-review',review);window.addEventListener('echo:booking-form-show',review);window.addEventListener('echo:assistant-conversation',conversation);
  return()=>{window.removeEventListener('echo:booking-review',review);window.removeEventListener('echo:booking-form-show',review);window.removeEventListener('echo:assistant-conversation',conversation);};
 },[]);
 const select=id=>{if(busy)return;setGoal(id);setView('conversation');ctx.openAssistant({source:'goal'});};
 const selectView=id=>{setView(id);if(id==='details')ctx.reviewDraft();};
 const selected=BOOKING_GOALS.find(item=>item.id===goal);
 const missing=missingOrderFields(ctx.order).length;
 return <section id="echo-ai" className="echo-section home-booking-assistant" aria-label="Echo AI" dir={ar?'rtl':'ltr'}>

  <div className="echo-ai-workspace" data-view={view}>
   <nav className="echo-ai-goals" aria-label={tr('Booking goals','أهداف الحجز')}>
    <div className="echo-ai-goals-brand"><span className="echo-ai-vinyl" aria-hidden="true"/><strong>ECHO <span>AI</span></strong></div>
    <p>{tr('YOUR BOOKING','حجزك')}</p>
    <select className="echo-ai-portrait-select echo-ai-goal-select" aria-label={tr('Booking goal','هدف الحجز')} value={goal} disabled={busy} onChange={event=>select(event.target.value)}>{BOOKING_GOALS.map(item=><option key={item.id} value={item.id}>{ar?item.ar:item.title}</option>)}</select>
    <select className="echo-ai-portrait-select echo-ai-view-select" aria-label={tr('Booking view','طريقة العرض')} value={view} onChange={event=>selectView(event.target.value)}>{[['conversation','Conversation','المحادثة'],['map','Concept map','خريطة المفاهيم'],['details','Review booking','مراجعة الحجز']].map(([id,en,arabic])=><option key={id} value={id}>{tr(en,arabic)}</option>)}</select>
    <div className="echo-ai-goal-list">{BOOKING_GOALS.map((item,index)=>{const Icon=icons[index],progress=goalProgress(ctx.order,item);return <button type="button" key={item.id} aria-pressed={goal===item.id} disabled={busy} onClick={()=>select(item.id)}><Icon size={17}/><span>{ar?item.ar:item.title}</span>{progress.complete?<Check size={13} className="is-complete"/>:<i aria-label={tr('Needs details','يحتاج تفاصيل')}/>}</button>;})}</div>
    <div className="echo-ai-draft-status"><span><i/>{tr('CURRENT DRAFT','المسودة الحالية')}</span><strong>{eventTypeLabel(ctx.order.event?.type,ar)||tr('Let’s plan your event','لنخطط لفعاليتك')}</strong><small>{ctx.saveState==='account-saved'?tr('Saved to your account','محفوظ في حسابك'):ctx.saveState==='pending'?tr('Saving changes…','جارٍ الحفظ…'):tr('Build it one goal at a time','أكمله هدفاً تلو الآخر')}</small></div>
    <button type="button" className="echo-ai-room-link" onClick={()=>scrollToAppSection('room',{source:'navigation'})}><Box size={16} aria-hidden="true"/><span>{tr('3D Room','الغرفة ثلاثية الأبعاد')}</span><ArrowDown size={14} aria-hidden="true"/></button>
   </nav>
   <div className="echo-ai-main">
    <header className="echo-ai-toolbar"><div><span>{tr('WORKING ON','نعمل على')}</span><h3>{view==='map'?tr('Your booking at a glance','حجزك بنظرة واحدة'):view==='details'?tr('Review booking','مراجعة الحجز'):ar?selected.ar:selected.title}</h3></div><div className="echo-ai-header-assistant ai-booking-panel" ref={setHeaderSlot}/><div className="echo-ai-view-tabs" role="group" aria-label={tr('Booking view','طريقة العرض')}>{[['conversation',MessageCircle,'Conversation','المحادثة'],['map',Network,'Concept map','خريطة المفاهيم'],['details',ClipboardCheck,'Review booking','مراجعة الحجز']].map(([id,Icon,en,arabic])=><button type="button" key={id} aria-pressed={view===id} onClick={()=>id==='details'?(setView(id),ctx.reviewDraft()):setView(id)}><Icon size={15}/><span>{tr(en,arabic)}</span></button>)}</div></header>
    <div className="echo-ai-content">
     <div className="echo-ai-conversation-host" hidden={view==='map'}><EventOrderAside ar={ar} user={user} token={token} auth={auth} workspace selectedGoal={goal} view={view} onConversation={()=>setView('conversation')} onBusyChange={setBusy} headerSlot={headerSlot}/></div>
     {view==='map'&&<><BookingConceptMap order={ctx.order} ar={ar} onSelect={select}/><footer className="echo-ai-map-footer"><span>{missing?tr(`${missing} required details to complete`,`${missing} تفاصيل مطلوبة متبقية`):tr('Required details complete. Review before sending.','اكتملت التفاصيل المطلوبة. راجعها قبل الإرسال.')}</span><button type="button" onClick={()=>{setView('details');ctx.reviewDraft();}}>{tr('Review & send','المراجعة والإرسال')}<ArrowUpRight size={15}/></button></footer></>}
    </div>
   </div>
  </div>
 </section>;
}
