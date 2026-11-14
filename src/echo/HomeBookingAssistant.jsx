import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {eventTypeLabel} from '../lib/eventTypeLabel';
import {scrollToAppSection} from '../lib/bookingViewport';
import {Sparkles,MessageCircle,Network,CalendarDays,Disc3,Boxes,UserRound,SlidersHorizontal,Check,ArrowUpRight,Box,ArrowDown,ClipboardList} from 'lucide-react';
import {EventOrderAside} from './EventOrderProvider';
import {useEventOrder} from './eventOrderContext';
import {BOOKING_GOALS,goalFields,goalProgress,goalValue} from '../lib/bookingGoals';
import {getPath,isAnswered,missingOrderFields} from '../lib/eventOrderCore.mjs';
import './glowCards.css';
import './homeBookingAssistant.css';

const icons=[UserRound,CalendarDays,Disc3,Boxes,SlidersHorizontal];
export function BookingConceptMap({order,ar,onSelect}){
 const tr=(en,arabic)=>ar?arabic:en;
 const surface=useRef(null),graph=useRef(null),[fit,setFit]=useState(1),[zoom,setZoom]=useState(null),[rowHeights,setRowHeights]=useState(()=>BOOKING_GOALS.map(()=>112));
 const rowTops=[];let graphHeight=12;
 for(const height of rowHeights){rowTops.push(graphHeight);graphHeight+=height+46;}
 graphHeight=Math.max(300,graphHeight-34);
 useLayoutEffect(()=>{
  const nodes=[...graph.current.querySelectorAll('.echo-map-branch')];
  const update=()=>{const heights=nodes.map(node=>Math.max(112,node.offsetHeight));setRowHeights(previous=>heights.every((height,index)=>height===previous[index])?previous:heights);};
  const observer=new ResizeObserver(update);nodes.forEach(node=>observer.observe(node));update();return()=>observer.disconnect();
 },[]);
 useEffect(()=>{const element=surface.current?.querySelector('.echo-booking-map');if(!element)return;const update=()=>setFit(Math.max(.01,Math.min(1,(element.clientWidth-32)/1000,(element.clientHeight-24)/graphHeight)));const observer=new ResizeObserver(update);observer.observe(element);update();return()=>observer.disconnect();},[graphHeight]);
 const scale=zoom??fit;
 return <div className="echo-map-surface" ref={surface}><div className="echo-map-zoom" role="group" aria-label={tr('Concept map zoom','تكبير خريطة المفاهيم')}><button type="button" aria-label={tr('Zoom out','تصغير')} onClick={()=>setZoom(Math.max(.25,scale-.15))}>−</button><output>{Math.round(scale*100)}%</output><button type="button" aria-label={tr('Zoom in','تكبير')} onClick={()=>setZoom(Math.min(1.75,scale+.15))}>+</button><button type="button" onClick={()=>setZoom(null)}>{tr('Fit','ملاءمة')}</button></div><div className="echo-booking-map" tabIndex={0} aria-label={tr('Booking concept map. Select a concept to work on it.','خريطة مفاهيم الحجز. اختر مفهوماً للعمل عليه.')}>
  <div className="echo-map-size" style={{width:1000*scale,height:graphHeight*scale}}><div ref={graph} className="echo-booking-graph" style={{height:graphHeight,transform:`scale(${scale})`}} dir="ltr">
   <svg viewBox={`0 0 1000 ${graphHeight}`} aria-hidden="true">{BOOKING_GOALS.map((goal,index)=>{const y=rowTops[index]+56;return <g key={goal.id} style={{'--goal-color':`var(--goal-${index})`}}><path d={`M 195 ${graphHeight/2} C 260 ${graphHeight/2}, 260 ${y}, 330 ${y}`}/><path d={`M 525 ${y} C 565 ${y}, 565 ${y}, 605 ${y}`}/><circle cx="330" cy={y} r="4"/><circle cx="605" cy={y} r="4"/></g>;})}</svg>
   <div className="echo-map-root" style={{top:graphHeight/2-75}}><Sparkles size={23}/><span>ECHO / {tr('CURRENT DRAFT','المسودة الحالية')}</span><strong>{eventTypeLabel(order.event?.type,ar)||tr('Your event','فعاليتك')}</strong><small>{order.event?.date||tr('Date to be decided','الموعد لم يُحدّد بعد')}</small></div>
   {BOOKING_GOALS.map((goal,index)=>{
    const progress=goalProgress(order,goal),Icon=icons[index];
    const answered=goalFields(goal).filter(field=>isAnswered(getPath(order,field.key)));
    const shown=(answered.length?answered:goalFields(goal).filter(field=>progress.missing.some(item=>item.key===field.key))).slice(0,3);
    return <div key={goal.id} className="echo-map-branch" style={{top:rowTops[index],'--goal-color':`var(--goal-${index})`}}>
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
// Short "label: value" lines shown for a section in the live summary (answered fields first, then what is still missing).
function sectionLines(order,goal,ar){
 const progress=goalProgress(order,goal),all=goalFields(goal);
 const answered=all.filter(field=>isAnswered(getPath(order,field.key)));
 const lines=answered.slice(0,3).map(field=>({key:field.key,label:ar?field.ar||field.label:field.label,value:goalValue(getPath(order,field.key),ar)}));
 if(goal.id==='rentals'&&order.equipment?.length)lines.push({key:'equipment',label:ar?'المعدات':'Equipment',value:goalValue(order.equipment,ar)});
 return {progress,lines};
}
export default function HomeBookingAssistant({lang,user,token,auth}){
 const ctx=useEventOrder(),ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
 const [goal,setGoal]=useState('event'),[view,setView]=useState('conversation'),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const review=()=>setView('conversation'),conversation=()=>setView('conversation');
  window.addEventListener('echo:booking-review',review);window.addEventListener('echo:booking-form-show',review);window.addEventListener('echo:assistant-conversation',conversation);
  return()=>{window.removeEventListener('echo:booking-review',review);window.removeEventListener('echo:booking-form-show',review);window.removeEventListener('echo:assistant-conversation',conversation);};
 },[]);
 const select=id=>{if(busy)return;setGoal(id);setView('conversation');ctx.openAssistant({source:'goal'});};
 const selected=BOOKING_GOALS.find(item=>item.id===goal);
 const missing=missingOrderFields(ctx.order).length;
 const sections=BOOKING_GOALS.map(item=>({item,...sectionLines(ctx.order,item,ar)}));
 const done=sections.filter(section=>section.progress.complete).length;
 const saveText=ctx.saveState==='account-saved'?tr('Saved to your account','محفوظ في حسابك'):ctx.saveState==='pending'?tr('Saving changes…','جارٍ الحفظ…'):tr('Draft in progress','المسودة قيد الإعداد');
 return <section id="echo-ai" className="echo-section home-booking-assistant ea" aria-label="Echo AI" dir={ar?'rtl':'ltr'}>
  <div className="ea-board">
   <article className="ea-card ea-card--toolbar" data-tone="0" aria-label={tr('Toolbar','شريط الأدوات')}>
    <div className="ea-brand"><span className="ea-vinyl" aria-hidden="true"/><strong>ECHO <span>AI</span></strong><small>{saveText}</small></div>
    <p className="ea-working"><span>{tr('Working on','نعمل على')}</span><strong>{ar?selected.ar:selected.title}</strong></p>
   </article>
   <article className="ea-card ea-card--chat" data-tone="3" aria-label={tr('Conversation','المحادثة')}>
    <header className="ea-card-head"><MessageCircle className="ea-card-icon" aria-hidden="true"/><div><h3>{tr('Conversation','المحادثة')}</h3><p>{tr('Tell Echo about your event','أخبر إيكو عن فعاليتك')}</p></div></header>
    <div className="ea-card-body"><div className="echo-ai-conversation-host"><EventOrderAside ar={ar} user={user} token={token} auth={auth} workspace selectedGoal={goal} view={view} onConversation={()=>setView('conversation')} onBusyChange={setBusy}/></div></div>
   </article>
   <article className="ea-card ea-card--map" data-tone="2" aria-label={tr('Concept map','خريطة المفاهيم')}>
    <header className="ea-card-head"><Network className="ea-card-icon" aria-hidden="true"/><div><h3>{tr('Concept map','خريطة المفاهيم')}</h3><p>{tr('Your booking at a glance','حجزك بنظرة واحدة')}</p></div></header>
    <div className="ea-card-body"><BookingConceptMap order={ctx.order} ar={ar} onSelect={select}/></div>
   </article>
   <article className="ea-card ea-card--review" data-tone="4" aria-label={tr('Booking review','مراجعة الحجز')}>
    <header className="ea-card-head"><ClipboardList className="ea-card-icon" aria-hidden="true"/><div><h3>{tr('Booking review','مراجعة الحجز')}</h3><p>{eventTypeLabel(ctx.order.event?.type,ar)||tr('Let’s plan your event','لنخطط لفعاليتك')}</p></div></header>
    <div className="ea-card-body ea-review">
     <div className="ea-summary-head">
      <div className="ea-progress" role="progressbar" aria-valuemin="0" aria-valuemax={BOOKING_GOALS.length} aria-valuenow={done} aria-label={tr('Sections complete','الأقسام المكتملة')}><i style={{width:`${done/BOOKING_GOALS.length*100}%`}}/></div>
      <small>{tr(`${done} of ${BOOKING_GOALS.length} sections complete`,`اكتمل ${done} من ${BOOKING_GOALS.length} أقسام`)}</small>
     </div>
     <ol className="ea-steps">{sections.map(({item,progress,lines},index)=>{const Icon=icons[index];return <li key={item.id}>
      <button type="button" aria-current={goal===item.id?'step':undefined} disabled={busy} onClick={()=>select(item.id)}>
       <span className="ea-step-icon" data-done={progress.complete?'':undefined}>{progress.complete?<Check size={15} aria-hidden="true"/>:<Icon size={15} aria-hidden="true"/>}</span>
       <span className="ea-step-text"><strong>{ar?item.ar:item.title}</strong>
        {lines.length?lines.map(line=><small key={line.key}><b>{line.label}</b> {line.value}</small>):<small className="ea-step-empty">{progress.missing.length?tr(`${progress.missing.length} to fill in`,`${progress.missing.length} للتعبئة`):tr('Optional','اختياري')}</small>}
       </span>
      </button>
     </li>;})}</ol>
     <div className="ea-actions">
      <button type="button" className="ea-primary" onClick={()=>{setView('details');ctx.reviewDraft();}}>{tr('Review & send','المراجعة والإرسال')}<ArrowUpRight size={16} aria-hidden="true"/></button>
      <small>{missing?tr(`${missing} required details left`,`${missing} تفاصيل مطلوبة متبقية`):tr('Everything required is filled in.','اكتملت التفاصيل المطلوبة.')}</small>
      <button type="button" className="ea-link" onClick={()=>scrollToAppSection('room',{source:'navigation'})}><Box size={15} aria-hidden="true"/>{tr('Plan in the 3D Room','خطط في الغرفة ثلاثية الأبعاد')}<ArrowDown size={14} aria-hidden="true"/></button>
     </div>
    </div>
   </article>
  </div>
 </section>;
}
