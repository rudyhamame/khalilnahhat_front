import {missingViewportFields,venueSelectionChanges} from '../lib/bookingFlow.mjs';
import EventTypeColumn from './EventTypeColumn';
import {lazy,Suspense,useEffect,useRef,useState} from 'react';
import {venueArea,areaFromAddress} from '../lib/addressSearch';
import {findVenues} from '../lib/venueSearch';
import {venueAddressParts} from '../lib/venueAddressParts';
import {rankVenues} from '../lib/venueLexical';
const VenueMap=lazy(()=>import('./VenueMap'));
import {ArrowUpRight,CalendarDays,ChevronLeft,ChevronRight,RefreshCw,Check,Users,MapPin} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {calendarDays,dateKey,torontoToday,draftTimeRange} from '../lib/bookingCalendar';
import {useEventOrder} from './eventOrderContext';
import './homeAvailability.css';
import './availabilityMinimal.css';
import {eventTypeLabel} from '../lib/eventTypeLabel';
import './bookingJourney.css';

const parse=key=>new Date(key+'T12:00:00');
const time=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
const clock=(minutes,ar)=>`${Math.floor(minutes/60)%24%12||12}:${String(minutes%60).padStart(2,'0')} ${Math.floor(minutes/60)%24<12?(ar?'ص':'AM'):(ar?'م':'PM')}`;
// The booking stores HH:MM; an end of 24:00 is stored as 00:00 (midnight), which the order treats as ending after midnight.
const stored=minutes=>time(minutes%1440);
const SLOTS=Array.from({length:49},(_,i)=>i*30);
function BookingStep({number,title,copy,cardTitle,children}){
 return <section className={`booking-step ${number%2?'is-card-left':'is-card-right'}`} aria-labelledby={`booking-step-${number}`}>
  <div className="booking-step-copy"><span className="booking-step-number">{String(number).padStart(2,'0')}</span><h2 id={`booking-step-${number}`}>{title}</h2><p>{copy}</p></div>
  <div className="booking-step-card"><h3 className="booking-card-title">{cardTitle}</h3>{children}</div>
 </section>;
}
export default function HomeAvailability({lang}){
 const shell=useRef(null);
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,locale=ar?'ar-CA':'en-CA',ctx=useEventOrder(),today=torontoToday();
 const [pending,setPending]=useState(null);
 const [mapOpen,setMapOpen]=useState(false);
 const [venueSearch,setVenueSearch]=useState({open:false,busy:false,error:'',items:[],notFound:false}),venueAbort=useRef(null),venueTimer=useRef(null);
 // The GTA question fills itself from the typed city or postal code; the guest can still change it (a manual choice is kept).
 const areaTouched=useRef(false),venueCity=ctx?.order.event?.venue?.city,venuePostal=ctx?.order.event?.venue?.postalCode,venueAreaNow=ctx?.order.event?.venue?.area;
 useEffect(()=>{if(!ctx||!canEdit||areaTouched.current)return;const guess=areaFromAddress({city:venueCity,postalCode:venuePostal});if(guess&&guess!==venueAreaNow)ctx.setField('event.venue.area',guess);},[venueCity,venuePostal]);// eslint-disable-line react-hooks/exhaustive-deps
 // Existing booking-summary and assistant links reveal the appropriate step.
 useEffect(()=>{
  let frame=0;
  const reveal=selector=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>shell.current?.querySelector(selector)?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));});};
  const face=event=>reveal(event.detail==='venue'?'#booking-venue':'#booking-date');
  const field=event=>{const path=event.detail?.path;if(path?.startsWith('event.'))reveal(`[data-booking-field="${CSS.escape(path)}"]`);};
  window.addEventListener('echo:availability-face',face);window.addEventListener('echo:booking-field-focus',field);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('echo:availability-face',face);window.removeEventListener('echo:booking-field-focus',field);};
 },[]);
 const [focus,setFocus]=useState(()=>ctx?.order.event.date||today),[refresh,setRefresh]=useState(0);
 const [state,setState]=useState({status:'loading',data:null});
 const sharedDate=ctx?.order.event.date,sharedStart=ctx?.order.event.startTime,sharedEnd=ctx?.order.event.endTime;
 // Time column: opens when a day is clicked. times are minutes since midnight; end 1440 means midnight.
 const [editingTime,setEditingTime]=useState('start'),[scrollTick,setScrollTick]=useState(0),[listOpen,setListOpen]=useState(false),[timeOpen,setTimeOpen]=useState(Boolean(sharedDate||sharedStart||sharedEnd)),[times,setTimes]=useState(()=>draftTimeRange(sharedStart,sharedEnd));
 useEffect(()=>{setTimes(draftTimeRange(sharedStart,sharedEnd));},[sharedStart,sharedEnd]);
 const listRef=useRef(null);
 useEffect(()=>{if(sharedDate)setFocus(sharedDate);setListOpen(false);},[sharedDate]);
 useEffect(()=>{setTimeOpen(Boolean(sharedDate||sharedStart||sharedEnd));},[sharedDate,sharedStart,sharedEnd]);
 const selectedDate=ctx?.draftEditable?sharedDate:timeOpen?focus:null;
 const current=parse(focus),year=current.getFullYear(),month=current.getMonth(),minYear=parse(today).getFullYear()-5,maxYear=minYear+20;
 useEffect(()=>{
  let alive=true;
  setState(previous=>({...previous,status:'loading'}));
  const load=()=>apiRequest(`/availability?year=${year}`).then(data=>{if(!data||data.year!==year||data.timezone!=='America/Toronto'||!data.days||typeof data.days!=='object')throw new Error('Invalid calendar data');if(alive)setState({status:'ready',data});}).catch(()=>{if(alive)setState(previous=>({...previous,status:'error'}));});
  load();const timer=setInterval(()=>{if(document.visibilityState==='visible')load();},60000);
  window.addEventListener('focus',load);
  return()=>{alive=false;clearInterval(timer);window.removeEventListener('focus',load);};
 },[year,refresh]);
 const ready=state.status==='ready'&&state.data?.year===year;
 const ranges=key=>ready&&Number(key.slice(0,4))===year?(state.data.days[key]||[]):null;
 const stateOf=key=>{const booked=ranges(key);if(!booked)return 'unknown';if(key<today)return 'past';return booked.reduce((sum,range)=>sum+range.end-range.start,0)>=1440?'booked':'free';};
 const statusLabel=key=>({unknown:tr('Unavailable','غير متاح'),past:tr('Past date','تاريخ سابق'),booked:tr('Booked all day','محجوز طوال اليوم'),free:tr('Available','متاح')}[stateOf(key)]);
 // The search uses every VENUE input (name, street address, city, postal code), so an address finds places too. With no match the visitor completes the address by hand.
 const searchVenue=(key,value)=>{
  clearTimeout(venueTimer.current);venueAbort.current?.abort();
  const venue={...(ctx?.order.event?.venue||{}),[key]:value};
  const query=['name','address','city','postalCode'].map(part=>String(venue[part]||'').trim()).filter(Boolean).join(', ');
  if(query.length<3||!ctx?.token){setVenueSearch({open:false,busy:false,error:'',items:[],notFound:false});return;}
  setVenueSearch({open:true,busy:true,error:'',items:[],notFound:false});
  venueTimer.current=setTimeout(async()=>{
   const controller=new AbortController();venueAbort.current=controller;
   try{
    let found=await findVenues(query,{token:ctx.token,signal:controller.signal,scope:'gta'});
    if(!found.length&&!controller.signal.aborted)found=await findVenues(query,{token:ctx.token,signal:controller.signal});
    if(controller.signal.aborted)return;
    const ranked=rankVenues(found,query);const items=ranked.length?ranked:found;
    setVenueSearch(items.length?{open:true,busy:false,error:'',items,notFound:false}:{open:false,busy:false,error:'',items:[],notFound:true});
   }catch(error){if(!controller.signal.aborted)setVenueSearch({open:true,busy:false,error:error.message||'',items:[],notFound:false});}
  },450);
 };
 useEffect(()=>()=>{clearTimeout(venueTimer.current);venueAbort.current?.abort();},[]);
 const uniqueVenues=items=>{const seen=new Set();return items.filter(item=>{const parts=venueAddressParts(item),key=[parts.name,parts.street].map(part=>String(part||'').toLowerCase().replace(/\s+/g,' ').trim()).join('|');if(seen.has(key))return false;seen.add(key);return true;});};
 const chooseVenue=item=>{const parts=venueAddressParts(item);venueSelectionChanges(item,venueArea(item)).forEach(({path,value})=>ctx.setField(path,path==='event.venue.address'&&parts.street?parts.street:path==='event.venue.postalCode'&&!value&&parts.postalCode?parts.postalCode:path==='event.venue.city'&&!value&&parts.city?parts.city:value));setVenueSearch({open:false,busy:false,error:'',items:[],notFound:false});};
 // Guest and account drafts share the same loading/conflict guard.
 const canEdit=Boolean(ctx?.draftEditable);
 const editNote=!ctx?.cloudReady?tr('Loading your saved draft…','جارٍ تحميل مسودتك…'):!canEdit?tr('This draft changed elsewhere. Reload it from the Booking summary.','تغيّرت المسودة في مكان آخر. أعد تحميلها من ملخص الحجز.'):'';
 const missing=ctx?missingViewportFields(ctx.order).map(field=>ar?field.ar:field.label):[];
 const clearDay=()=>{setListOpen(false);setTimeOpen(false);setTimes({start:null,end:null});setEditingTime('start');if(ctx?.draftEditable){ctx.setField('event.date','');ctx.setField('event.startTime','');ctx.setField('event.endTime','');}};
 const chooseDate=(key,confirmed)=>{
  if(key===sharedDate)return;
  if(key===focus&&timeOpen){if(!confirmed&&times.start!==null){setPending({apply:()=>chooseDate(key,true),text:tr('Unselecting the day clears your selected time.','إلغاء اختيار اليوم سيمسح الوقت الذي اخترته.')});return;}clearDay();return;}
  if(!confirmed&&key!==focus&&times.start!==null){setPending({apply:()=>chooseDate(key,true),text:tr('Changing the day clears your selected time.','تغيير اليوم سيمسح الوقت الذي اخترته.')});return;}
  setTimeOpen(true);setListOpen(false);setEditingTime('start');setScrollTick(n=>n+1);
  if(key!==focus){setTimes({start:null,end:null});if(ctx?.draftEditable&&sharedStart){ctx.setField('event.startTime','');ctx.setField('event.endTime','');}}
  setFocus(key);
  if(ctx?.draftEditable&&stateOf(key)==='free')ctx.setField('event.date',key);
 };
 const nextKey=(()=>{const d=parse(focus);d.setDate(d.getDate()+1);return dateKey(d);})(),booked=[...(ranges(focus)||[]),...(ranges(nextKey)||[]).map(range=>({start:range.start+1440,end:range.end+1440}))],overlaps=(a,b)=>booked.some(range=>a<range.end&&b>range.start);
 const saveTimes=range=>{if(ctx?.draftEditable&&range.start!==null&&range.end!==null){ctx.setField('event.startTime',stored(range.start));ctx.setField('event.endTime',stored(range.end));}};
 useEffect(()=>{if(ctx?.draftEditable&&timeOpen&&times.start!==null&&times.end!==null&&focus>=today&&sharedDate!==focus)ctx.setField('event.date',focus);},[ctx,timeOpen,times.start,times.end,focus,sharedDate,today]);
 // Explicit endpoint editing keeps a completed range editable without resetting it.
 const pickTime=(t,confirmed)=>{
  // Only a new START asks first (it can reset the end); picking an end time never needs a confirmation.
  if(!confirmed&&editingTime==='start'&&times.start!==null&&times.start!==t){setPending({apply:()=>pickTime(t,true),title:tr('Change your start time?','تغيير وقت البدء؟'),text:tr('Changing the start time updates your event time.','تغيير وقت البدء سيعدّل وقت فعاليتك.')});return;}
  if(editingTime==='start'){
   const end=times.end!==null&&times.end>t&&times.end<=t+600&&!overlaps(t,times.end)?times.end:null;
   setTimes({start:t,end});setEditingTime('end');setListOpen(false);
   if(ctx?.draftEditable){ctx.setField('event.startTime',stored(t));ctx.setField('event.endTime',end===null?'':stored(end));}
  }else{
   const next={start:times.start,end:t};setTimes(next);saveTimes(next);setListOpen(false);
  }
 };
 const slotDisabled=t=>{
  if(!ready||focus<today||stateOf(focus)==='booked')return true;
  if(editingTime==='start')return t>=1440||overlaps(t,t+30);
  return times.start===null||t<=times.start||overlaps(times.start,t);
 };
 // Endless list: three copies of the slots; scrolling past either copy edge jumps by one copy, so it never hits a start or end.
 const loopSlots=editingTime==='start'?SLOTS.filter(t=>t<1440):times.start===null?[]:Array.from({length:47},(_,i)=>times.start+30*(i+1));
 const loopScroll=event=>{
  const list=event.currentTarget,first=list.querySelector('[data-copy="0"]'),second=list.querySelector('[data-copy="1"]');
  if(!first||!second)return;
  const copy=second.offsetTop-first.offsetTop;
  if(list.scrollTop<copy*.5)list.scrollTop+=copy;else if(list.scrollTop>copy*1.5)list.scrollTop-=copy;
 };
 useEffect(()=>{
  if(timeOpen&&listOpen&&listRef.current){
   const target=editingTime==='start'?times.start:(times.end??(times.start===null?null:times.start+240));
   const list=listRef.current,button=list.querySelector(`[data-copy="1"][data-minute="${target??1080}"]`)||list.querySelector('[data-copy="1"]');
   if(button)list.scrollTop=button.offsetTop-(list.clientHeight-button.offsetHeight)/2;
  }
 },[timeOpen,listOpen,focus,scrollTick,editingTime,times.start,times.end]);
 const adjacentMonth=direction=>new Date(year,month+direction,1,12).toLocaleDateString(locale,{month:'short'});
 const move=direction=>{
  const next=parse(focus);next.setDate(1);next.setMonth(month+direction);
  if(next.getFullYear()>=minYear&&next.getFullYear()<=maxYear)setFocus(dateKey(next));
 };
 const format=(key,options)=>parse(key).toLocaleDateString(locale,options);
 const fullDate=key=>format(key,{weekday:'long',month:'long',day:'numeric',year:'numeric'});
 const title=format(focus,{month:'long',year:'numeric'});
 const monthGrid=m=>{
  const dates=calendarDays(year,m);
  return <div className="avail-month" style={{'--calendar-weeks':dates.length/7}}>
   {Array.from({length:7},(_,i)=><span key={`weekday-${i}`} className="avail-weekday">{new Date(2026,10,i+1,12).toLocaleDateString(locale,{weekday:'short'})}</span>)}
   {dates.map(day=>{const key=dateKey(day),outside=day.getMonth()!==m,kind=stateOf(key);return <button type="button" key={key} className={`avail-date is-${kind}${outside?' is-outside':''}${key===selectedDate&&timeOpen?' is-selected':''}${key===today?' is-today':''}`} aria-label={`${fullDate(key)} · ${statusLabel(key)}`} aria-pressed={key===selectedDate&&timeOpen} disabled={kind==='booked'||kind==='unknown'||key<today} onClick={()=>chooseDate(key)}><span>{day.getDate()}</span>{<small>{kind==='free'?(key===selectedDate&&timeOpen?tr('Free (selected)','متاح (مختار)'):tr('Free','متاح')):kind==='booked'?tr('Booked','محجوز'):''}</small>}{key===sharedDate&&key===selectedDate&&timeOpen&&<Check size={12}/>}</button>;})}
  </div>;
 };
 const canChoose=ready&&focus>=today&&stateOf(focus)!=='booked';
 const calendar=(<div className="avail-calendar" data-booking-field="event.date" aria-busy={state.status==='loading'}>
     {!ready?<div className="avail-message" role="status"><CalendarDays size={28}/><p>{state.status==='error'?tr('Could not load availability. Free times cannot be confirmed.','تعذر تحميل المواعيد. لا يمكن تأكيد الأوقات المتاحة.'):tr('Loading the calendar…','جارٍ تحميل التقويم…')}</p>{state.status==='error'&&<button type="button" onClick={()=>setRefresh(value=>value+1)}>{tr('Retry','إعادة المحاولة')}</button>}</div>:monthGrid(month)}
    </div>);
 const timeFields=(<div className="avail-times" role="group" aria-label={tr('Booking time','وقت الحجز')}>
     <div className="avail-time-heading"><span className="avail-kicker">{tr('EVENT TIME','وقت الفعالية')} {times.start!==null&&<a href="#clear-time" className="avail-times-clear" onClick={event=>{event.preventDefault();setPending({title:tr('Clear event time?','مسح وقت الفعالية؟'),apply:()=>{setTimes({start:null,end:null});setEditingTime('start');if(ctx?.draftEditable){ctx.setField('event.startTime','');ctx.setField('event.endTime','');}},text:tr('This removes your selected time.','سيؤدي هذا إلى إزالة الوقت الذي اخترته.')})}}>({tr('clear','مسح')})</a>}</span><span aria-live="polite">{times.start!==null&&times.end!==null&&`${Math.floor((times.end-times.start)/60)} ${tr('h','س')}${(times.end-times.start)%60?` ${(times.end-times.start)%60}${tr(' min',' د')}`:''}`}</span></div>
     
     <div className="avail-time-endpoints">{!listOpen&&['start','end'].map(endpoint=><button type="button" key={endpoint} data-booking-field={endpoint==='start'?'event.startTime':'event.endTime'} className={`avail-time-endpoint${editingTime===endpoint?' is-editing':''}${editingTime===endpoint&&times[endpoint]===null?' is-blinking':''}`} aria-pressed={editingTime===endpoint} disabled={endpoint==='end'&&times.start===null} onClick={()=>{setEditingTime(endpoint);setListOpen(true);}}><span>{endpoint==='start'?tr('Start','البدء'):tr('End','النهاية')}</span><strong>{times[endpoint]===null?tr('Select time','اختر الوقت'):clock(times[endpoint],ar)}{times[endpoint]>=1440?<small> {tr('next day','اليوم التالي')}</small>:null}</strong></button>)}</div>
     {listOpen&&<div className="avail-times-top"><button type="button" className="avail-times-back" onClick={()=>setListOpen(false)}><ChevronLeft size={16} aria-hidden="true"/>{tr('Back','رجوع')}</button><p className="avail-times-summary" aria-live="polite">{editingTime==='start'?tr('When does it start?','متى تبدأ الفعالية؟'):tr('When does it end?','متى تنتهي الفعالية؟')}</p></div>}
     {listOpen&&(canChoose?<div ref={listRef} className="avail-times-list" role="listbox" aria-label={editingTime==='start'?tr('Start time options','خيارات وقت البدء'):tr('End time options','خيارات وقت النهاية')} onScroll={loopScroll}>{[0,1,2].flatMap(copy=>loopSlots.map(t=>{const disabled=slotDisabled(t);return <button type="button" role="option" key={`${copy}-${t}`} data-copy={copy} data-minute={t} aria-selected={times[editingTime]===t} aria-hidden={copy!==1||undefined} tabIndex={copy===1?undefined:-1} className={`avail-time-option${times[editingTime]===t?' is-selected':''}`} disabled={disabled} onClick={()=>pickTime(t)}>{clock(t,ar)}{t===1440?tr(' · midnight',' · منتصف الليل'):t>1440?tr(' · next day',' · اليوم التالي'):''}{overlaps(t,t+30)&&t<1440||(t>=1440&&overlaps(t-30,t))?tr(' · booked',' · محجوز'):''}</button>;}))}</div>:<p className="avail-times-empty">{tr('Choose a free day to set a time.','اختر يوماً متاحاً لتحديد الوقت.')}</p>)}
     
     
    </div>);
 const guestFields=(<div className="avail-guests-row"><span className="avail-kicker">{tr('GUESTS','الضيوف')}</span><label className="event-type-guests"><Users size={17} strokeWidth={1.6} aria-hidden="true"/><input data-booking-field="event.guestCount" type="number" inputMode="numeric" min="1" max="100000" required aria-required="true" disabled={!canEdit} placeholder={tr('Number of guests *','عدد الضيوف *')} aria-label={tr('Number of guests (required)','عدد الضيوف (مطلوب)')} value={ctx?.order.event?.guestCount??''} onChange={event=>{const raw=event.target.value;ctx?.setField('event.guestCount',raw===''?null:Math.min(100000,Math.max(1,Math.floor(Number(raw)))));}}/></label></div>);
 const venueFields=(<div className="avail-venue-fields" role="group" aria-label={tr('Venue','المكان')}>
      <span className="avail-kicker">{tr('VENUE','المكان')}</span>
      {[['name',tr('Venue name *','اسم المكان *'),'organization'],['address',tr('Street address *','العنوان *'),'street-address']].map(([key,label,auto])=><input key={key} data-booking-field={'event.venue.'+key} type="text" autoComplete={auto} maxLength={key==='address'?240:160} disabled={!canEdit} placeholder={label} aria-label={label} value={ctx?.order.event?.venue?.[key]??''} onChange={event=>{ctx?.setField('event.venue.'+key,event.target.value||null);searchVenue(key,event.target.value);}}/>)}
      <div className="avail-venue-pair">{[['city',tr('City *','المدينة *'),80],['postalCode',tr('Postal code *','الرمز البريدي *'),12]].map(([key,label,max])=><input key={key} data-booking-field={'event.venue.'+key} type="text" autoComplete={key==='city'?'address-level2':'postal-code'} maxLength={max} disabled={!canEdit} placeholder={label} aria-label={label} value={ctx?.order.event?.venue?.[key]??''} onChange={event=>{ctx?.setField('event.venue.'+key,event.target.value||null);searchVenue(key,event.target.value);}}/>)}</div>
      <input data-booking-field="event.venue.addressDetails" type="text" maxLength={160} autoComplete="off" disabled={!canEdit} placeholder={tr('Unit # or any extra info','رقم الوحدة أو أي معلومات إضافية')} aria-label={tr('Unit number or any extra info (optional)','رقم الوحدة أو أي معلومات إضافية (اختياري)')} value={ctx?.order.event?.venue?.addressDetails??''} onChange={event=>ctx?.setField('event.venue.addressDetails',event.target.value||null)}/>
      <select data-booking-field="event.venue.setting" aria-label={tr('Indoor or outdoor (required)','داخلي أو خارجي (مطلوب)')} disabled={!canEdit} value={ctx?.order.event?.venue?.setting||''} onChange={event=>ctx?.setField('event.venue.setting',event.target.value||null)}><option value="">{tr('Indoor or outdoor *','داخلي أو خارجي *')}</option><option value="indoor">{tr('Indoor','داخلي')}</option><option value="outdoor">{tr('Outdoor','خارجي')}</option><option value="both">{tr('Indoor and outdoor','داخلي وخارجي')}</option></select>
      <select data-booking-field="event.venue.area" aria-label={tr('Is the venue inside the GTA (Greater Toronto Area)? (required)','هل المكان داخل تورونتو الكبرى (GTA)؟ (مطلوب)')} disabled={!canEdit} value={ctx?.order.event?.venue?.area||''} onChange={event=>{areaTouched.current=true;ctx?.setField('event.venue.area',event.target.value||null);}}><option value="">{tr('Inside the GTA? *','داخل تورونتو الكبرى؟ *')}</option><option value="gta">{tr('Yes, inside the GTA','نعم، داخل تورونتو الكبرى')}</option><option value="outside_gta">{tr('No, outside the GTA','لا، خارج تورونتو الكبرى')}</option></select>
      {venueSearch.open&&<div className="avail-venue-dropdown" role="region" aria-label={tr('Venue suggestions','اقتراحات الأماكن')} aria-live="polite"><button type="button" className="avail-venue-close" aria-label={tr('Close suggestions','إغلاق الاقتراحات')} onClick={()=>setVenueSearch(state=>({...state,open:false}))}>×</button>
       {venueSearch.busy?<p className="avail-venue-note" role="status"><i aria-hidden="true"/>{tr('Searching venues…','جارٍ البحث عن الأماكن…')}</p>:venueSearch.error?<p className="avail-venue-note" role="alert">{venueSearch.error}</p>:!venueSearch.items.length?<p className="avail-venue-note">{tr('No matching places found. Try a shorter name or an address.','لا توجد نتائج مطابقة. جرّب اسماً أقصر أو عنواناً.')}</p>:<ul className="avail-venue-grid">{uniqueVenues(venueSearch.items).map((item,index)=><li key={item.id||item.sourceId||`${item.name}|${item.address}`} style={{'--i':index}}><button type="button" onClick={()=>chooseVenue(item)}>{(()=>{const p=venueAddressParts(item);return <><strong>{p.name}</strong><span className="avail-venue-lines">{[p.street,p.cityProvince,p.postalCountry].filter(Boolean).map(line=><span key={line}>{line}</span>)}</span></>;})()}</button></li>)}</ul>}</div>}
      {!ctx?.token&&<p className="avail-venue-hint">{tr('Venue search is available once you sign in. For now, type the address yourself.','البحث عن الأماكن متاح بعد تسجيل الدخول. الآن اكتب العنوان بنفسك.')}</p>}
      {venueSearch.notFound&&<p className="avail-venue-hint" role="status">{tr('No matching place found. Complete the address manually.','لم يتم العثور على مكان مطابق. أكمل العنوان يدوياً.')}</p>}
      <button type="button" className="avail-map-toggle" aria-pressed={mapOpen} onClick={()=>setMapOpen(value=>!value)}>{<MapPin size={16} aria-hidden="true"/>}{mapOpen?tr('Hide map','إخفاء الخريطة'):tr('Find on map','ابحث على الخريطة')}</button>
     </div>);
 const event=ctx?.order.event;
 const summary=[
  [tr('Event type','نوع الفعالية'),eventTypeLabel(event?.type,ar)],
  [tr('Date','التاريخ'),event?.date?fullDate(event.date):''],
  [tr('Time · Toronto','الوقت · تورونتو'),sharedStart&&sharedEnd?`${clock(times.start,ar)} – ${clock(times.end,ar)}${times.end>=1440?tr(' (next day)',' (اليوم التالي)'):''}`:''],
  [tr('Guests','الضيوف'),event?.guestCount],
  [tr('Venue','المكان'),event?.venue?.name],
  [tr('Address','العنوان'),[event?.venue?.address,event?.venue?.city,event?.venue?.postalCode].filter(Boolean).join(', ')],
 ];
 return <section id="availability" ref={shell} className="echo-section home-availability booking-journey" aria-label={tr('Plan your event','خطط لفعاليتك')} dir={ar?'rtl':'ltr'}>
  <div className="booking-journey-inner">
   <header className="booking-journey-intro"><span>{tr('YOUR EVENT, YOUR WAY','فعاليتك، على طريقتك')}</span><h1>{tr('Let’s make it happen.','لنحوّل فكرتك إلى واقع.')}</h1><p>{tr('A few details help us understand your celebration. Start wherever you’re ready, and come back to any step as your plans take shape.','تساعدنا بعض التفاصيل على فهم احتفالك. ابدأ بما تعرفه، وعُد إلى أي خطوة كلما اتضحت خططك.')}</p></header>
   {editNote&&<p className="avail-edit-note" role="status">{editNote}</p>}
   <BookingStep number={1} title={tr('What are we celebrating?','بماذا نحتفل؟')} cardTitle={tr('Choose your event','اختر نوع فعاليتك')} copy={tr('A wedding, a milestone, or a night with your team—each occasion has its own rhythm. Choose the closest match so Echo can shape the music, sound, lighting, and key moments around your celebration. Choose Other if your plans don’t fit a category.','لكل مناسبة إيقاعها، من الزفاف إلى الإنجازات واللقاءات مع فريقك. اختر النوع الأقرب لخططك كي ننسّق الموسيقى والصوت والإضاءة ولحظات الحفل بما يناسب احتفالك. اختر «أخرى» إن لم تجد النوع المناسب.')}>
    <EventTypeColumn ar={ar}/>
    {event?.type==='other'&&<label className="booking-field"><span>{tr('Give your event a name','ما اسم فعاليتك؟')}</span><input data-booking-field="event.title" maxLength={120} disabled={!canEdit} value={event?.title||''} onChange={e=>ctx?.setField('event.title',e.target.value||null)} placeholder={tr('Event title','عنوان الفعالية')}/></label>}
   </BookingStep>
   <BookingStep number={2} title={tr('Find your moment.','اختر الموعد المناسب.')} cardTitle={tr('Date & time','التاريخ والوقت')} copy={tr('Pick an available day, then tell us when your event starts and ends. Include the moments you want us there for, from the first welcome to the last song. Times are shown in Toronto time, and your event can end after midnight. Availability is confirmed when Echo accepts your booking.','اختر يوماً متاحاً، ثم حدّد وقت بداية الفعالية ونهايتها. أخبرنا بالمدة التي تحتاجنا خلالها، من الترحيب الأول إلى الأغنية الأخيرة. جميع الأوقات بتوقيت تورونتو، ويمكن أن تنتهي الفعالية بعد منتصف الليل. يُؤكّد التوفر عند قبول Echo لحجزك.')}>
    <div id="booking-date">
     <div className="avail-navigation"><div className="avail-period"><button type="button" aria-label={tr('Previous month','الشهر السابق')} onClick={()=>move(-1)}><ChevronLeft size={17}/><span>{adjacentMonth(-1)}</span></button><h3>{title}</h3><button type="button" aria-label={tr('Next month','الشهر التالي')} onClick={()=>move(1)}><span>{adjacentMonth(1)}</span><ChevronRight size={17}/></button></div><div><button type="button" onClick={()=>setFocus(today)}>{tr('Today','اليوم')}</button><select aria-label={tr('Choose year','اختر السنة')} value={year} onChange={event=>{const next=parse(focus);next.setDate(1);next.setFullYear(Number(event.target.value));setFocus(dateKey(next));}}>{Array.from({length:maxYear-minYear+1},(_,i)=><option key={i} value={minYear+i}>{minYear+i}</option>)}</select><button type="button" aria-label={tr('Refresh availability','تحديث المواعيد')} onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={14}/></button></div></div>
     {calendar}
     <div className="booking-calendar-note"><span>{tr('Available','متاح')}</span><small>{tr('Your date is reserved only after confirmation.','لا يُحجز موعدك إلا بعد التأكيد.')}</small></div>
     <div className="booking-time-fields">{timeOpen?timeFields:<p className="booking-field-hint">{tr('Choose a day above to select your start and end times.','اختر يوماً أعلاه لتحديد وقت البداية والنهاية.')}</p>}</div>
     {sharedDate&&<button type="button" className="booking-clear-date" onClick={()=>setPending({title:tr('Clear your date and time?','مسح الموعد والوقت؟'),text:tr('You can choose another day afterwards.','يمكنك اختيار يوم آخر بعد ذلك.'),apply:clearDay})}>{tr('Clear date & time','مسح التاريخ والوقت')}</button>}
    </div>
   </BookingStep>
   <BookingStep number={3} title={tr('Make room for everyone.','مساحة لكل ضيوفك.')} cardTitle={tr('Your guest list','عدد الضيوف')} copy={tr('An estimated guest count is a great place to start. It helps us recommend a sound system that reaches the whole room and a setup that suits your crowd. You can update the number as your guest list comes together.','يكفينا عدد تقريبي في البداية. يساعدنا ذلك على اقتراح نظام صوت يغطي المكان وتجهيزات تناسب الحضور. يمكنك تعديل العدد كلما اكتملت قائمة ضيوفك.')}>
    {guestFields}
    <p className="booking-field-hint">{tr('A best estimate is fine for now.','يكفي تقدير تقريبي حالياً.')}</p>
   </BookingStep>
   <BookingStep number={4} title={tr('Set the scene.','أخبرنا عن المكان.')} cardTitle={tr('Where is it happening?','أين ستقام الفعالية؟')} copy={tr('Tell us where to bring the experience. The address, indoor or outdoor setting, and location inside or outside the GTA help us plan delivery and equipment. Enter the venue details directly, or sign in to search for a location on the map.','أخبرنا أين تريد إقامة الفعالية. يساعدنا العنوان، وما إذا كان المكان داخلياً أو خارجياً وداخل تورونتو الكبرى أو خارجها، على تخطيط النقل والتجهيزات. أدخل التفاصيل مباشرة، أو سجّل الدخول للبحث عن المكان على الخريطة.')}>
    <div id="booking-venue">{venueFields}
    {mapOpen&&<div className="booking-venue-map"><Suspense fallback={<p role="status">{tr('Loading venue map…','جارٍ تحميل الخريطة…')}</p>}><VenueMap key={ctx?.draftId||'guest'} token={ctx?.token} ar={ar} venue={event?.venue} onChoose={canEdit?chooseVenue:null} setting={event?.venue?.setting||''} onSetting={canEdit?value=>ctx.setField('event.venue.setting',value||null):null} aiSearch={ctx?.aiVenueSearch?.draftId===ctx?.draftId?ctx.aiVenueSearch:null} onSendToAi={canEdit?place=>{if(!ctx.panelOpen){ctx.openAssistant({source:'venue-selection'});ctx.markAssistantConversationStarted?.();}return ctx.aiVenueChoice?.current?.(place);}:null} aiSendDisabled={!ctx?.aiVenueSearch?.canSend}/></Suspense></div>}
    </div>
   </BookingStep>
   <BookingStep number={5} title={tr('Looking good? Let’s keep going.','هل كل شيء جاهز؟ لنتابع.')} cardTitle={tr('Your event so far','تفاصيل فعاليتك حتى الآن')} copy={tr('Take a moment to check the details. Next, we’ll bring together your contact information, DJ preferences, and rental choices for a quote request. You can still make changes before sending anything.','راجع التفاصيل للحظة. بعد ذلك، نجمع معلومات التواصل وتفضيلات الدي جي واختيارات التأجير لطلب عرض سعر. يمكنك تعديل كل شيء قبل إرسال الطلب.')}>
    <dl className="booking-journey-summary">{summary.map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value||tr('Not set yet','لم يُحدّد بعد')}</dd></div>)}</dl>
    {!!missing.length&&<p className="booking-field-hint" role="status"><strong>{tr('Still to add: ','ما زال مطلوباً: ')}</strong>{missing.join(' · ')}</p>}
    <button type="button" className="booking-journey-continue" disabled={!canChoose||!!missing.length||!canEdit} onClick={()=>ctx?.reviewDraft()}>{tr('Continue planning','تابع التخطيط')}<ArrowUpRight size={18} aria-hidden="true"/></button>
    <p className="booking-field-hint">{tr('This step does not send a request or reserve your date.','هذه الخطوة لا ترسل طلباً ولا تحجز موعدك.')}</p>
   </BookingStep>
  </div>
 {pending&&<div className="avail-confirm-backdrop" role="presentation" onKeyDown={event=>{if(event.key==='Escape')setPending(null);}}><div className="avail-confirm" role="alertdialog" aria-modal="true" aria-labelledby="avail-confirm-title" aria-describedby="avail-confirm-text"><h3 id="avail-confirm-title">{pending.title||tr('Change your date or time?','تغيير الموعد؟')}</h3><p id="avail-confirm-text">{pending.text}</p><div className="avail-confirm-actions"><button type="button" autoFocus onClick={()=>setPending(null)}>{tr('Keep current','إبقاء الحالي')}</button><button type="button" className="is-danger" onClick={()=>{const apply=pending.apply;setPending(null);apply();}}>{tr('Yes, change','نعم، غيّر')}</button></div></div></div>}
 </section>;
}
