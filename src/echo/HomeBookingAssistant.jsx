import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import {eventTypeLabel} from '../lib/eventTypeLabel';
import {Sparkles,MessageCircle,CalendarDays,Disc3,Boxes,UserRound,SlidersHorizontal,Check,ArrowUpRight,ClipboardList,Trash2,X} from 'lucide-react';
import {EventOrderAside} from './EventOrderProvider';
import {useEventOrder} from './eventOrderContext';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {bookingServiceId} from '../lib/rentalCatalog';
import {numberedRentalCatalog} from '../lib/numberedRentalCatalog';
import {BOOKING_GOALS,goalFields,goalProgress,goalValue} from '../lib/bookingGoals';
import {fieldName,getPath,isAnswered,missingOrderFields} from '../lib/eventOrderCore.mjs';
import {useConceptMapNavigation} from './useConceptMapNavigation';
import './glowCards.css';
import './homeBookingAssistant.css';

const icons=[UserRound,CalendarDays,Disc3,Boxes,SlidersHorizontal];
// The DJ service belongs to its own section, so it is left out of Rental services & equipment.
const draftValue=(order,key)=>key==='services'?(order.services||[]).filter(id=>id!=='dj'):getPath(order,key);
// The data atoms of one section, grouped Entered / Needs attention / Optional. Booking review and the concept map both render exactly this.
const AtomRow=({line})=><small className="ea-data-row" data-field={line.key} data-empty={line.empty?'':undefined} data-indent={line.indent?'':undefined}><b>{line.label}</b><span className="ea-data-value">{line.value}</span></small>;
function AtomGroups({lines,progress,tr,wrap=null,atoms=false}){
 if(atoms&&wrap)return <>{lines.map(line=>{const group=groupOf(line);return wrap(<span className="ea-group" data-group={['entered','attention','optional'][group]}><AtomRow line={line}/></span>,group,line.key);})}</>;
 const groupOf=line=>line.group??(!line.empty?0:line.required?1:2);
 const groups=[[null,lines.filter(line=>groupOf(line)===0)],[tr('Needs attention','يحتاج انتباهك'),lines.filter(line=>groupOf(line)===1)],[tr('Optional','اختياري'),lines.filter(line=>groupOf(line)===2)]];
 const boxed=(node,group,key=group)=>wrap?wrap(node,group,key):node;
 return <>{groups.map(([title,rows],group)=>rows.length>0&&boxed(<span className="ea-group" data-group={['entered','attention','optional'][group]} key={group}>{title&&<em>{title}</em>}{!title&&lines.some(line=>groupOf(line)!==0)&&<em>{tr('Entered','تم إدخاله')}</em>}{rows.map(line=><AtomRow key={line.key} line={line}/>)}</span>,group,group))}{!lines.length&&boxed(<small className="ea-step-empty">{progress.missing.length?tr(`${progress.missing.length} to fill in`,`${progress.missing.length} للتعبئة`):tr('Optional','اختياري')}</small>,1,'empty')}</>;
}
// Connector shapes between a section box (right edge x=525) and its group/atom boxes (left edge x=605).
function branchLines(shape,y,ys,nextYs,nextY){
 const out=ys.map(ty=>({dot:ty}));
 if(shape==='stem')return [{d:`M 525 ${y} H 565 M 565 ${Math.min(y,...ys)} V ${Math.max(y,...ys)}${ys.map(ty=>` M 565 ${ty} H 605`).join('')}`},...out];
 if(shape==='net')return [...ys.map(ty=>({d:`M 525 ${y} L 605 ${ty}`})),...(nextY===null?[]:nextYs.map(ty=>({d:`M 525 ${y} L 605 ${ty}`,faint:true}))),...(nextY===null?[]:ys.map(ty=>({d:`M 525 ${nextY} L 605 ${ty}`,faint:true}))),...out];
 return [...ys.map(ty=>({d:shape==='elbow'?`M 525 ${y} H 565 V ${ty} H 605`:shape==='straight'?`M 525 ${y} L 605 ${ty}`:shape==='wave'?`M 525 ${y} Q 545 ${(y+ty)/2-16}, 565 ${(y+ty)/2} T 605 ${ty}`:shape==='steps'?`M 525 ${y} H 545 V ${(y+ty)/2} H 585 V ${ty} H 605`:`M 525 ${y} C 565 ${y}, 565 ${ty}, 605 ${ty}`})),...out];
}
export function BookingConceptMap({order,ar,onSelect}){
 const tr=(en,arabic)=>ar?arabic:en,rentalData=useRentalCatalog(),rentals=numberedRentalCatalog(rentalData.catalog,rentalData.equipment);
 const surface=useRef(null),viewport=useRef(null),frame=useRef(null),graph=useRef(null),[fit,setFit]=useState(1),[zoom,setZoom]=useState(null),[shape,setShape]=useState(()=>{try{return localStorage.getItem('echo-map-shape')||'curved';}catch{return 'curved';}}),[targets,setTargets]=useState([]),[format,setFormat]=useState(()=>{try{return localStorage.getItem('echo-map-format')||'groups';}catch{return 'groups';}}),[rowHeights,setRowHeights]=useState(()=>BOOKING_GOALS.map(()=>112));
 const rowTops=[];let graphHeight=12;
 for(const height of rowHeights){rowTops.push(graphHeight);graphHeight+=height+46;}
 graphHeight=Math.max(300,graphHeight-34);
 useLayoutEffect(()=>{
  const nodes=[...graph.current.querySelectorAll('.echo-map-branch')];
  const update=()=>{const heights=nodes.map(node=>Math.max(112,node.offsetHeight));setRowHeights(previous=>heights.every((height,index)=>height===previous[index])?previous:heights);};
  const observer=new ResizeObserver(update);nodes.forEach(node=>observer.observe(node));update();return()=>observer.disconnect();
 },[]);
 useEffect(()=>{const element=surface.current?.querySelector('.echo-booking-map');if(!element)return;const update=()=>setFit(Math.max(.01,Math.min(1,(element.clientWidth-48)/1000,(element.clientHeight-48)/graphHeight)));const observer=new ResizeObserver(update);observer.observe(element);update();return()=>observer.disconnect();},[graphHeight]);
 // Where each group/atom box starts, so every branch line can end at its box.
 useLayoutEffect(()=>{
  const next=[...graph.current.querySelectorAll('.echo-map-branch')].map(node=>[...node.querySelectorAll('.echo-map-values')].map(box=>box.offsetTop+22));
  setTargets(previous=>JSON.stringify(previous)===JSON.stringify(next)?previous:next);
 });
 const scale=zoom??fit;
 // When Echo changes the draft: zoom the map to the changed branch, pan it to the centre and make its values glow.
 const fitRef=useRef(fit);fitRef.current=fit;
 useEffect(()=>{
  let timer=0,frames=[];
  const focus=event=>{
   const paths=event.detail?.paths||[];
   window.setTimeout(()=>{
    const view=viewport.current,root=graph.current;if(!view||!root)return;
    const spans=paths.flatMap(path=>[...root.querySelectorAll('[data-field]')].filter(el=>el.dataset.field===path||(path.startsWith('equipment')||path==='services')&&el.dataset.field==='equipment'));
    if(!spans.length)return;
    const branch=spans[0].closest('.echo-map-branch');
    root.querySelectorAll('.echo-map-flash').forEach(el=>el.classList.remove('echo-map-flash'));
    const reduce=matchMedia('(prefers-reduced-motion: reduce)').matches;
    setZoom(Math.max(fitRef.current,Math.min(1,(view.clientWidth-24)/Math.max(1,branch.offsetWidth))));
    frames.forEach(cancelAnimationFrame);
    frames=[requestAnimationFrame(()=>{frames[1]=requestAnimationFrame(()=>{
     const box=view.getBoundingClientRect(),target=branch.getBoundingClientRect();
     view.scrollBy({left:target.left+target.width/2-(box.left+box.width/2),top:target.top+target.height/2-(box.top+box.height/2),behavior:reduce?'instant':'smooth'});
     spans.forEach(el=>{void el.offsetWidth;el.classList.add('echo-map-flash');});
     branch.classList.add('echo-map-flash');
     clearTimeout(timer);timer=window.setTimeout(()=>root.querySelectorAll('.echo-map-flash').forEach(el=>el.classList.remove('echo-map-flash')),3400);
    });})];
   },250);
  };
  window.addEventListener('echo:draft-updated',focus);
  return()=>{window.removeEventListener('echo:draft-updated',focus);clearTimeout(timer);frames.forEach(cancelAnimationFrame);};
 },[]);
 const {zoomTo,panning,onClickCapture}=useConceptMapNavigation({viewport,frame,scale,onZoom:setZoom,minScale:Math.min(.1,fit)});
 return <div className="echo-map-surface" ref={surface}><div className="echo-map-zoom" role="group" aria-label={tr('Concept map zoom','تكبير خريطة المفاهيم')}><button type="button" aria-label={tr('Zoom out','تصغير')} onClick={()=>zoomTo(scale/1.2)}>−</button><output>{Math.round(scale*100)}%</output><button type="button" aria-label={tr('Zoom in','تكبير')} onClick={()=>zoomTo(scale*1.2)}>+</button><button type="button" onClick={()=>{viewport.current.scrollTo(0,0);setZoom(null);}}>{tr('Fit','ملاءمة')}</button><select className="echo-map-format" value={shape} aria-label={tr('Branch shape','شكل التفرع')} onChange={event=>{setShape(event.target.value);try{localStorage.setItem('echo-map-shape',event.target.value);}catch{/* Optional preference. */}}}><option value="curved">{tr('Curved','منحنٍ')}</option><option value="elbow">{tr('Elbow','زاوية')}</option><option value="straight">{tr('Straight','مستقيم')}</option><option value="net">{tr('Fish net','شبكة صيد')}</option><option value="stem">{tr('Stem','جذع')}</option><option value="wave">{tr('Wave','موجة')}</option><option value="steps">{tr('Steps','درجات')}</option></select><select className="echo-map-format" value={format} aria-label={tr('Branch format','شكل الفروع')} onChange={event=>{setFormat(event.target.value);try{localStorage.setItem('echo-map-format',event.target.value);}catch{/* Optional preference. */}}}><option value="groups">{tr('By status','حسب الحالة')}</option><option value="single">{tr('One box','مربع واحد')}</option><option value="atoms">{tr('Each field','كل حقل')}</option></select></div><div ref={viewport} className={`echo-booking-map${panning?' is-panning':''}`} onClickCapture={onClickCapture} tabIndex={0} aria-label={tr('Booking concept map. Drag to pan, scroll to zoom, or pinch with two fingers. Select a concept to work on it.','خريطة مفاهيم الحجز. اسحب للتحريك واستخدم العجلة أو إصبعين للتكبير. اختر مفهوماً للعمل عليه.')}>
  <div className="echo-map-canvas" style={{width:`max(100%, ${1000*scale+48}px)`,height:`max(100%, ${graphHeight*scale+48}px)`}}><div ref={frame} className="echo-map-size" style={{width:1000*scale,height:graphHeight*scale}}><div ref={graph} className="echo-booking-graph" style={{height:graphHeight,transform:`scale(${scale})`}} dir="ltr">
   <svg viewBox={`0 0 1000 ${graphHeight}`} aria-hidden="true">{BOOKING_GOALS.map((goal,index)=>{const y=rowTops[index]+56;return <g key={goal.id} style={{'--goal-color':`var(--goal-${index})`}}><path d={`M 195 ${graphHeight/2} C 260 ${graphHeight/2}, 260 ${y}, 330 ${y}`}/>{branchLines(shape,y,(targets[index]?.length?targets[index]:[56]).map(offset=>rowTops[index]+offset),(targets[index+1]||[]).map(offset=>(rowTops[index+1]??0)+offset),rowTops[index+1]!==undefined?rowTops[index+1]+56:null).map((line,key)=>line.dot?<circle key={key} cx="605" cy={line.dot} r="3"/>:<path key={key} d={line.d} style={line.faint?{opacity:.28}:undefined}/>)}<circle cx="330" cy={y} r="4"/></g>;})}</svg>
   <div className="echo-map-root" style={{top:graphHeight/2-75}}><Sparkles size={23}/><span>ECHO / {tr('CURRENT DRAFT','المسودة الحالية')}</span><strong>{eventTypeLabel(order.event?.type,ar)||tr('Your event','فعاليتك')}</strong><small>{order.event?.date||tr('Date to be decided','الموعد لم يُحدّد بعد')}</small></div>
   {BOOKING_GOALS.map((goal,index)=>{
    const {progress,lines}=sectionLines(order,goal,ar,rentals),Icon=icons[index];
    return <div key={goal.id} className="echo-map-branch" style={{top:rowTops[index],'--goal-color':`var(--goal-${index})`}}>
     <button type="button" className="echo-map-concept" onClick={()=>onSelect(goal.id)}><Icon size={18}/><strong>{ar?goal.ar:goal.title}</strong><span>{progress.missing.length?`${progress.missing.length} ${tr('to complete','متبقي')}`:tr('Ready to review','جاهز للمراجعة')}<ArrowUpRight size={13}/></span></button>
     <div className="echo-map-groups" dir={ar?'rtl':'ltr'}>
      {format==='single'?<button type="button" className="echo-map-values" onClick={()=>onSelect(goal.id)} aria-label={tr(`Work on ${goal.title}`,`العمل على ${goal.ar}`)}><AtomGroups lines={lines} progress={progress} tr={tr}/></button>
      :<AtomGroups lines={lines} progress={progress} tr={tr} atoms={format==='atoms'} wrap={(node,group,key)=><button type="button" className="echo-map-values" data-group={['entered','attention','optional'][group]} key={key} onClick={()=>onSelect(goal.id)} aria-label={tr(`Work on ${goal.title}`,`العمل على ${goal.ar}`)}>{node}</button>}/>}
     </div>
    </div>;
   })}
  </div></div></div>
 </div></div>;
}
// Short "label: value" lines shown for a section in the live summary (answered fields first, then what is still missing).
function sectionLines(order,goal,ar,rentals=[]){
 const progress=goalProgress(order,goal),tr=(en,arabic)=>ar?arabic:en;
 const tree=goal.id==='rentals'&&rentals.length>0;
 // Rental services & equipment is listed as a tree: every service (MC included) with all of its equipment under it.
 const all=goalFields(goal).filter(field=>(!field.gate||getPath(order,field.gate)===true)&&!(tree&&['services','music.mcRequested','rental.requested','music.djMc'].includes(field.key)));
 // Every field of the section is listed with its value; fields not answered yet read "Not set yet".
 const lines=all.map(field=>({key:field.key,label:(fieldName(field.key,ar)||(ar?field.ar||field.label:field.label)).replace(/\s*[(（](?:optional|only if|اختياري)[^)）]*[)）]/i,''),value:field.key==='event.type'?eventTypeLabel(order.event?.type,ar)||goalValue(null,ar):goalValue(draftValue(order,field.key),ar),empty:!isAnswered(draftValue(order,field.key)),required:progress.missing.some(item=>item.key===field.key)}));
 if(tree){
  const needs=progress.missing.some(item=>item.key==='services'),chosen=order.equipment||[],name=item=>ar?item.nameAr||item.name:item.name;
  for(const service of rentals){
   const mc=service.selectionField==='music.mcRequested',used=service.equipment.some(item=>chosen.some(line=>line.id===item.id)&&!item.isSet);
   const on=mc?order.music?.mcRequested===true:used||(service.bookingServiceId!=='rental'&&(order.services||[]).includes(service.bookingServiceId));
   const group=on?0:needs?1:2;
   lines.push({key:`service:${service.id}`,label:name(service),value:on?tr('Added','مضاف'):goalValue(null,ar),empty:!on,required:false,group});
   for(const item of service.equipment){const line=chosen.find(entry=>entry.id===item.id);lines.push({key:`equipment:${service.id}:${item.id}`,label:name(item),value:line?`× ${line.quantity}`:goalValue(null,ar),empty:!line,required:false,group,indent:true});}
  }
 }else if(goal.id==='rentals'&&order.equipment?.length)lines.push({key:'equipment',label:ar?'المعدات':'Equipment',value:goalValue(order.equipment,ar)});
 return {progress,lines};
}
export default function HomeBookingAssistant({lang,user,token,auth,overlay=false}){
 const ctx=useEventOrder(),ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
 const {catalog,equipment:catalogEquipment}=useRentalCatalog();
 const [goal,setGoal]=useState('event'),[view,setView]=useState('conversation'),[busy,setBusy]=useState(false);
 const overlayRoot=useRef(null),[closing,setClosing]=useState(false),[closeError,setCloseError]=useState('');
 useEffect(()=>{if(overlay)overlayRoot.current?.querySelector('.ea-overlay-close')?.focus({preventScroll:true});},[overlay]);
 const closeOverlay=async()=>{
  if(closing)return;setClosing(true);setCloseError('');
  try{await ctx.flushConversation?.();window.location.assign('/booking');}
  catch(problem){setCloseError(problem.message||tr('The conversation could not be saved. Retry before closing.','تعذر حفظ المحادثة. أعد المحاولة قبل الإغلاق.'));setClosing(false);}
 };

 useEffect(()=>{
  const review=()=>setView('conversation'),conversation=()=>setView('conversation');
  window.addEventListener('echo:booking-review',review);window.addEventListener('echo:booking-form-show',review);window.addEventListener('echo:assistant-conversation',conversation);
  return()=>{window.removeEventListener('echo:booking-review',review);window.removeEventListener('echo:booking-form-show',review);window.removeEventListener('echo:assistant-conversation',conversation);};
 },[]);
 // When Echo updates the draft, scroll Booking review to the changed values and make them glow.
 const steps=useRef(null);
 useEffect(()=>{
  let timer=0;
  const show=event=>{
   const paths=event.detail?.paths||[],list=steps.current;if(!list)return;
   window.setTimeout(()=>{
    const rows=paths.flatMap(path=>[...list.querySelectorAll('[data-field]')].filter(row=>row.dataset.field===path||(path.startsWith('equipment')||path==='services')&&row.dataset.field==='equipment'));
    if(!rows.length)return;
    const box=list.getBoundingClientRect(),first=rows[0].getBoundingClientRect();
    list.scrollTo({top:Math.max(0,list.scrollTop+first.top-box.top-box.height/3),behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    list.querySelectorAll('.ea-flash').forEach(row=>row.classList.remove('ea-flash'));
    rows.forEach(row=>{void row.offsetWidth;row.classList.add('ea-flash');});
    clearTimeout(timer);timer=window.setTimeout(()=>rows.forEach(row=>row.classList.remove('ea-flash')),3200);
   },150);
  };
  window.addEventListener('echo:draft-updated',show);
  return()=>{window.removeEventListener('echo:draft-updated',show);clearTimeout(timer);};
 },[]);
 const [silent,setSilent]=useState(false);
 const select=(id,quiet=false)=>{if(busy)return;setSilent(quiet);setGoal(id);setView('conversation');ctx.openAssistant({source:'goal'});};
 const selected=BOOKING_GOALS.find(item=>item.id===goal);
 const missing=missingOrderFields(ctx.order).length;
 const rentals=numberedRentalCatalog(catalog,catalogEquipment);
 const sections=BOOKING_GOALS.map(item=>({item,...sectionLines(ctx.order,item,ar,rentals)}));
 const done=sections.filter(section=>section.progress.complete).length;
 const saveText=ctx.saveState==='account-saved'?tr('Saved to your account','محفوظ في حسابك'):ctx.saveState==='pending'?tr('Saving changes…','جارٍ الحفظ…'):tr('Draft in progress','المسودة قيد الإعداد');
 return <section ref={overlayRoot} id="echo-ai" className={`echo-section home-booking-assistant ea${overlay?' ea-overlay':''}`} aria-label="Echo AI" dir={ar?'rtl':'ltr'} onKeyDown={event=>{if(overlay&&event.key==='Escape'&&!event.defaultPrevented){event.preventDefault();void closeOverlay();}}}>
  <div className="ea-board">
   <article className="ea-card ea-card--toolbar" data-tone="0" aria-label={tr('Toolbar','شريط الأدوات')}>
    <div className="ea-brand"><span className="ea-vinyl" aria-hidden="true"/><strong>ECHO <span>AI</span></strong><small>{saveText}</small></div>
    <p className="ea-working"><span>{tr('Working on','نعمل على')}</span><strong>{ar?selected.ar:selected.title}</strong></p>
    {overlay&&<button type="button" className="ea-overlay-close" aria-label={tr('Close Echo AI','إغلاق إيكو AI')} title={tr('Close Echo AI','إغلاق إيكو AI')} disabled={closing} onClick={closeOverlay}><X size={20} aria-hidden="true"/></button>}
    {closeError&&<p className="ea-overlay-error" role="alert">{closeError}</p>}
   </article>
   <article className="ea-card ea-card--chat" data-tone="3" aria-label={tr('Conversation','المحادثة')}>
    <header className="ea-card-head"><MessageCircle className="ea-card-icon" aria-hidden="true"/><div><h3>{tr('Conversation','المحادثة')}</h3><p>{tr('Tell Echo about your event','أخبر إيكو عن فعاليتك')}</p></div></header>
    <div className="ea-card-body"><div className="echo-ai-conversation-host"><EventOrderAside ar={ar} user={user} token={token} auth={auth} workspace selectedGoal={goal} silentGoal={silent} view={view} onConversation={()=>setView('conversation')} onBusyChange={setBusy}/></div></div>
   </article>
   <article className="ea-card ea-card--map" data-tone="2" aria-label={tr('Concept map','خريطة المفاهيم')}>
    <div className="ea-card-body"><BookingConceptMap order={ctx.order} ar={ar} onSelect={select}/></div>
   </article>
   <article className="ea-card ea-card--review" data-tone="4" aria-label={tr('Booking review','مراجعة الحجز')}>
    <header className="ea-card-head"><ClipboardList className="ea-card-icon" aria-hidden="true"/><div><h3>{tr('Booking review','مراجعة الحجز')}</h3><p>{eventTypeLabel(ctx.order.event?.type,ar)||tr('Let’s plan your event','لنخطط لفعاليتك')}</p></div><button type="button" className="ea-delete" aria-label={tr('Delete draft','حذف المسودة')} title={tr('Delete draft','حذف المسودة')} disabled={ctx.clearing||(ctx.signedIn&&!ctx.cloudReady)} onClick={()=>{if(window.confirm(tr('Delete this draft? This cannot be undone.','حذف هذه المسودة؟ لا يمكن التراجع.')))void ctx.clear();}}><Trash2 size={16} aria-hidden="true"/></button></header>
    <div className="ea-card-body ea-review">
     <div className="ea-summary-head">
      <div className="ea-progress" role="progressbar" aria-valuemin="0" aria-valuemax={BOOKING_GOALS.length} aria-valuenow={done} aria-label={tr('Sections complete','الأقسام المكتملة')}><i style={{width:`${done/BOOKING_GOALS.length*100}%`}}/></div>
      <small>{tr(`${done} of ${BOOKING_GOALS.length} sections complete`,`اكتمل ${done} من ${BOOKING_GOALS.length} أقسام`)}</small>
     </div>
     <ol className="ea-steps" ref={steps}>{sections.map(({item,progress,lines},index)=>{const Icon=icons[index];return <li key={item.id}>
      <button type="button" aria-current={goal===item.id?'step':undefined} disabled={busy} onClick={()=>select(item.id,true)}>
       <span className="ea-step-icon" data-done={progress.complete?'':undefined}>{progress.complete?<Check size={15} aria-hidden="true"/>:<Icon size={15} aria-hidden="true"/>}</span>
       <span className="ea-step-text"><strong>{ar?item.ar:item.title}</strong>
        <AtomGroups lines={lines} progress={progress} tr={tr}/>
       </span>
      </button>
     </li>;})}</ol>
     {(ctx.order.services?.some(id=>id!=='dj')||ctx.order.equipment?.length>0)&&<ul className="ea-chosen" aria-label={tr('Chosen services and equipment','الخدمات والمعدات المختارة')}>
      {ctx.order.services.filter(id=>id!=='dj').map(id=>{const row=catalog.find(item=>item.kind==='service'&&bookingServiceId(item)===id);return <li key={id}><span>{row?(ar?row.nameAr||row.name:row.name):ctx.lang?.t?.q?.svcs?.[id]||id}</span><button type="button" disabled={!ctx.cloudReady} aria-label={tr('Remove service','إزالة الخدمة')} onClick={()=>ctx.removeService(id)}><X size={13} aria-hidden="true"/></button></li>;})}
      {ctx.order.equipment.map(line=>{const item={...line,...catalogEquipment.find(entry=>entry.id===line.id)};return <li key={line.id}><span>{ar?item.nameAr||item.name:item.name} × {line.quantity}</span><button type="button" disabled={!ctx.cloudReady} aria-label={tr('Remove item','إزالة القطعة')} onClick={()=>ctx.setEquipment(item,0)}><X size={13} aria-hidden="true"/></button></li>;})}
     </ul>}
     <div className="ea-actions">
      <button type="button" className="ea-primary" onClick={()=>{setView('details');ctx.reviewDraft();}}>{tr('Review & send','المراجعة والإرسال')}<ArrowUpRight size={16} aria-hidden="true"/></button>
      <small>{missing?tr(`${missing} required details left`,`${missing} تفاصيل مطلوبة متبقية`):tr('Everything required is filled in.','اكتملت التفاصيل المطلوبة.')}</small>
     </div>
    </div>
   </article>
  </div>
 </section>;
}
