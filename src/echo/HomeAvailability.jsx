import {requiredMark,requiredNote,bookingAtomInputProps,bookingAtom,bookingAtomApplies,bookingAtomRange,bookingAtomRequired} from '../lib/bookingAtoms.mjs';
import {EVENT_PAGE_STEPS,VENUE_LOCATION_PATHS,VENUE_RESET_PATHS,eventScheduleChanges} from '../lib/eventPageModel';
import CanadianPhoneInput from '../components/CanadianPhoneInput';
import {stepLabel,venueSelectionChanges} from '../lib/bookingFlow.mjs';
import {fieldName,optionName} from '../lib/eventOrderCore.mjs';
import EventTypeColumn from './EventTypeColumn';
import {lazy,Suspense,useEffect,useMemo,useRef,useState} from 'react';
import {findVenues} from '../lib/venueSearch';
import {venueAddressParts} from '../lib/venueAddressParts';
import {countryOptions} from '../lib/countryOptions';
const VenueMapCanvas=lazy(()=>import('./VenueMapCanvas'));
import './venueMap.css';
import {rankVenues} from '../lib/venueLexical';
import {CalendarDays,ChevronLeft,ChevronRight,RefreshCw,Check,Users,X} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {calendarDays,dateKey,torontoToday,draftTimeRange} from '../lib/bookingCalendar';
import {useEventOrder} from './eventOrderContext';
import SubmittedBookingNotice from './SubmittedBookingNotice';
import {PhaseHeading,FieldCode} from './BookingPhases';
import BookingStep from './BookingStep';
import {contactChoices} from '../lib/contactChoices.mjs';
import './homeAvailability.css';
import './availabilityMinimal.css';
import './bookingJourney.css';
import './yourEventSoFar.css';
import './bookingMobile.css';

const parse=key=>new Date(key+'T12:00:00');
const time=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
const clock=(minutes,ar)=>`${Math.floor(minutes/60)%24%12||12}:${String(minutes%60).padStart(2,'0')} ${Math.floor(minutes/60)%24<12?(ar?'ص':'AM'):(ar?'م':'PM')}`;
// The booking stores HH:MM; an end of 24:00 is stored as 00:00 (midnight), which the order treats as ending after midnight.
const stored=minutes=>time(minutes%1440);
const SLOTS=Array.from({length:49},(_,i)=>i*30);
// Wraps a text input with a clear (x) button that shows only while it has text.
function Clearable({clear,show,label,children}){
 if(!clear)return children;
 return <span className="avail-clearable">{children}{show&&<button type="button" className="avail-clear-text" aria-label={label} onClick={clear}><X size={15} aria-hidden="true"/></button>}</span>;
}
export default function HomeAvailability({lang}){
 const shell=useRef(null);
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,locale=ar?'ar-CA':'en-CA',ctx=useEventOrder(),today=torontoToday(),countries=useMemo(()=>countryOptions(ar),[ar]);
 const [pending,setPending]=useState(null);
 const [emailText,setEmailText]=useState(null),storedEmail=ctx?.order.customer?.email||'';
 useEffect(()=>{setEmailText(text=>text!==null&&text!==storedEmail?null:text);},[storedEmail]);
 const [mapShown,setMapShown]=useState(false),[manualAddress,setManualAddress]=useState(false);
 const PLACE_PATHS=VENUE_LOCATION_PATHS;
 const venueNow=ctx?.order.event?.venue,pinNow=Number.isFinite(venueNow?.latitude)&&Number.isFinite(venueNow?.longitude);
 // The address can only be set by clicking a search result (or "Can't find the venue address"); an address that already exists without a pin (e.g. from Echo AI) stays editable.
 const addrManualBase=manualAddress||(Boolean(venueNow?.address)&&!pinNow);
 const [venueSearch,setVenueSearch]=useState({open:false,busy:false,error:'',items:[],notFound:false}),venueAbort=useRef(null),venueTimer=useRef(null);
 // If the search is unavailable the visitor can always type the address themselves.
 const addrManual=addrManualBase||Boolean(venueSearch.error);
 // Existing booking-summary and assistant links reveal the appropriate step.
 useEffect(()=>{
  let frame=0;
  const reveal=selector=>{cancelAnimationFrame(frame);frame=requestAnimationFrame(()=>{frame=requestAnimationFrame(()=>shell.current?.querySelector(selector)?.scrollIntoView({block:'center',behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'}));});};
  const face=event=>reveal(event.detail==='venue'?'#booking-venue':'#booking-date');
  const field=event=>{const path=event.detail?.path;if(path?.startsWith('event.'))reveal(`[data-booking-field="${CSS.escape(path)}"]`);};
  window.addEventListener('echo:availability-face',face);window.addEventListener('echo:booking-field-focus',field);
  const requested=new URLSearchParams(window.location.search).get('field');
  if(requested?.startsWith('event.'))field({detail:{path:requested}});
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
 const searchVenue=(key,value,manual=addrManual)=>{
  setMapShown(false);clearTimeout(venueTimer.current);venueAbort.current?.abort();
  const venue={...(ctx?.order.event?.venue||{}),[key]:value};
  const query=(manual?['name','address','city','postalCode']:['name']).map(part=>String(venue[part]||'').trim()).filter(Boolean).join(', ');
  if(query.length<3){setVenueSearch({open:false,busy:false,error:'',items:[],notFound:false});return;}
  setVenueSearch({open:true,busy:true,error:'',items:[],notFound:false});
  venueTimer.current=setTimeout(async()=>{
   const controller=new AbortController();venueAbort.current=controller;
   try{
    let found=await findVenues(query,{token:ctx.token,signal:controller.signal,scope:'gta'});
    if(!found.length&&!controller.signal.aborted)found=await findVenues(query,{token:ctx.token,signal:controller.signal});
    if(controller.signal.aborted)return;
    const ranked=rankVenues(found,query);const items=ranked.length?ranked:found;
    setVenueSearch({open:true,busy:false,error:'',items,notFound:false});
   }catch(error){if(!controller.signal.aborted)setVenueSearch({open:true,busy:false,error:error.message||'',items:[],notFound:false});}
  },450);
 };
 useEffect(()=>()=>{clearTimeout(venueTimer.current);venueAbort.current?.abort();},[]);
 const uniqueVenues=items=>{const seen=new Set();return items.filter(item=>{const parts=venueAddressParts(item),key=[parts.name,parts.street].map(part=>String(part||'').toLowerCase().replace(/\s+/g,' ').trim()).join('|');if(seen.has(key))return false;seen.add(key);return true;});};
 const chooseVenue=item=>{setMapShown(true);setManualAddress(false);const parts=venueAddressParts(item);venueSelectionChanges(item).forEach(({path,value})=>ctx.setField(path,path==='event.venue.address'&&parts.street?parts.street:path==='event.venue.postalCode'&&!value&&parts.postalCode?parts.postalCode:path==='event.venue.city'&&!value&&parts.city?parts.city:value));setVenueSearch({open:false,busy:false,error:'',items:[],notFound:false});};
 // Guest and account drafts share the same loading/conflict guard.
 const canEdit=Boolean(ctx?.draftEditable),signedIn=Boolean(ctx?.signedIn),choices=contactChoices({email:ctx?.order.customer?.email,phone:ctx?.order.customer?.phone});
 const editNote=ctx?.pendingRequest?'':!ctx?.cloudReady?tr('Loading your saved draft…','جارٍ تحميل مسودتك…'):!canEdit?tr('This draft changed elsewhere. Reload it from the Booking summary.','تغيّرت المسودة في مكان آخر. أعد تحميلها من ملخص الحجز.'):'';
 const clearDay=()=>{setListOpen(false);setTimeOpen(false);setTimes({start:null,end:null});setEditingTime('start');if(ctx?.draftEditable){ctx.editDraft(eventScheduleChanges({date:null,startTime:null,endTime:null}));}};
 const chooseDate=(key,confirmed)=>{
  if(key===sharedDate)return;
  if(key===focus&&timeOpen){if(!confirmed&&times.start!==null){setPending({apply:()=>chooseDate(key,true),text:tr('Unselecting the day clears your selected time.','إلغاء اختيار اليوم سيمسح الوقت الذي اخترته.')});return;}clearDay();return;}
  if(!confirmed&&key!==focus&&times.start!==null){setPending({apply:()=>chooseDate(key,true),text:tr('Changing the day clears your selected time.','تغيير اليوم سيمسح الوقت الذي اخترته.')});return;}
  setTimeOpen(true);setListOpen(false);setEditingTime('start');setScrollTick(n=>n+1);
  if(key!==focus)setTimes({start:null,end:null});
  setFocus(key);
  if(ctx?.draftEditable)ctx.editDraft(eventScheduleChanges({date:key,...(key!==focus?{startTime:null,endTime:null}:{})}));
 };
 const nextKey=(()=>{const d=parse(focus);d.setDate(d.getDate()+1);return dateKey(d);})(),booked=[...(ranges(focus)||[]),...(ranges(nextKey)||[]).map(range=>({start:range.start+1440,end:range.end+1440}))],overlaps=(a,b)=>booked.some(range=>a<range.end&&b>range.start);
 const saveTimes=range=>{if(ctx?.draftEditable&&range.start!==null&&range.end!==null){ctx.editDraft(eventScheduleChanges({startTime:stored(range.start),endTime:stored(range.end)}));}};
 useEffect(()=>{if(ctx?.draftEditable&&timeOpen&&times.start!==null&&times.end!==null&&focus>=today&&sharedDate!==focus)ctx.setField('event.date',focus);},[ctx,timeOpen,times.start,times.end,focus,sharedDate,today]);
 // Explicit endpoint editing keeps a completed range editable without resetting it.
 const pickTime=(t,confirmed)=>{
  // Only a new START asks first (it can reset the end); picking an end time never needs a confirmation.
  if(!confirmed&&editingTime==='start'&&times.start!==null&&times.start!==t){setPending({apply:()=>pickTime(t,true),title:tr('Change your start time?','تغيير وقت البدء؟'),text:tr('Changing the start time updates your event time.','تغيير وقت البدء سيعدّل وقت فعاليتك.')});return;}
  if(editingTime==='start'){
   const end=times.end!==null&&times.end>t&&times.end<=t+600&&!overlaps(t,times.end)?times.end:null;
   setTimes({start:t,end});setEditingTime('end');setListOpen(false);
   if(ctx?.draftEditable){ctx.editDraft(eventScheduleChanges({startTime:stored(t),endTime:end===null?null:stored(end)}));}
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
   {dates.map(day=>{const key=dateKey(day),outside=day.getMonth()!==m,kind=stateOf(key);return <button type="button" key={key} className={`avail-date is-${kind}${outside?' is-outside':''}${key===selectedDate&&timeOpen?' is-selected':''}${key===today?' is-today':''}`} aria-label={`${fullDate(key)} · ${statusLabel(key)}`} aria-pressed={key===selectedDate&&timeOpen} disabled={kind==='booked'||kind==='unknown'||key<today} onClick={()=>chooseDate(key)}><span>{day.getDate()}</span>{<small>{kind==='free'?tr('Free','متاح'):kind==='booked'?tr('Booked','محجوز'):''}</small>}{key===sharedDate&&key===selectedDate&&timeOpen&&<Check size={12}/>}</button>;})}
  </div>;
 };
 const canChoose=ready&&focus>=today&&stateOf(focus)!=='booked';
 const calendar=(<div className="avail-calendar" data-booking-field="event.date" aria-busy={state.status==='loading'}>
     {!ready?<div className="avail-message" role="status"><CalendarDays size={28}/><p>{state.status==='error'?tr('Could not load availability. Free times cannot be confirmed.','تعذر تحميل المواعيد. لا يمكن تأكيد الأوقات المتاحة.'):tr('Loading the calendar…','جارٍ تحميل التقويم…')}</p>{state.status==='error'&&<button type="button" onClick={()=>setRefresh(value=>value+1)}>{tr('Retry','إعادة المحاولة')}</button>}</div>:monthGrid(month)}
    </div>);
 const timeFields=(<div className="avail-times" role="group" aria-label={tr('Booking time','وقت الحجز')}>
     <div className="avail-time-heading"><span className="avail-kicker"><FieldCode code={bookingAtomRange(['event.startTime','event.endTime'])}/>{tr('EVENT TIME','وقت الفعالية')+requiredMark('event.startTime')} {times.start!==null&&<a href="#clear-time" className="avail-times-clear" onClick={event=>{event.preventDefault();if(!canEdit)return;setPending({title:tr('Clear event time?','مسح وقت الفعالية؟'),apply:()=>{setTimes({start:null,end:null});setEditingTime('start');if(ctx?.draftEditable){ctx.editDraft(eventScheduleChanges({startTime:null,endTime:null}));}},text:tr('This removes your selected time.','سيؤدي هذا إلى إزالة الوقت الذي اخترته.')})}}>({tr('clear','مسح')})</a>}</span><span aria-live="polite">{times.start!==null&&times.end!==null&&`${Math.floor((times.end-times.start)/60)} ${tr('h','س')}${(times.end-times.start)%60?` ${(times.end-times.start)%60}${tr(' min',' د')}`:''}`}</span></div>

     <div className="avail-time-endpoints">{!listOpen&&['start','end'].map(endpoint=><button type="button" key={endpoint} data-booking-field={endpoint==='start'?'event.startTime':'event.endTime'} className={`avail-time-endpoint${editingTime===endpoint?' is-editing':''}${editingTime===endpoint&&times[endpoint]===null?' is-blinking':''}`} aria-pressed={editingTime===endpoint} disabled={endpoint==='end'&&times.start===null} onClick={()=>{setEditingTime(endpoint);setListOpen(true);}}><span>{endpoint==='start'?tr('Start','البدء')+requiredMark('event.startTime'):tr('End','النهاية')+requiredMark('event.endTime')}</span><strong>{times[endpoint]===null?tr('Select time','اختر الوقت'):clock(times[endpoint],ar)}{times[endpoint]>=1440?<small> {tr('next day','اليوم التالي')}</small>:null}</strong></button>)}</div>
     {listOpen&&<div className="avail-times-top"><button type="button" className="avail-times-back" onClick={()=>setListOpen(false)}><ChevronLeft size={16} aria-hidden="true"/>{tr('Back','رجوع')}</button><p className="avail-times-summary" aria-live="polite">{editingTime==='start'?tr('When does it start?','متى تبدأ الفعالية؟'):tr('When does it end?','متى تنتهي الفعالية؟')}</p></div>}
     {listOpen&&(canChoose?<div ref={listRef} className="avail-times-list" role="listbox" aria-label={editingTime==='start'?tr('Start time options','خيارات وقت البدء'):tr('End time options','خيارات وقت النهاية')} onScroll={loopScroll}>{[0,1,2].flatMap(copy=>loopSlots.map(t=>{const disabled=slotDisabled(t);return <button type="button" role="option" key={`${copy}-${t}`} data-copy={copy} data-minute={t} aria-selected={times[editingTime]===t} aria-hidden={copy!==1||undefined} tabIndex={copy===1?undefined:-1} className={`avail-time-option${times[editingTime]===t?' is-selected':''}`} disabled={disabled} onClick={()=>pickTime(t)}>{clock(t,ar)}{t===1440?tr(' · midnight',' · منتصف الليل'):t>1440?tr(' · next day',' · اليوم التالي'):''}{overlaps(t,t+30)&&t<1440||(t>=1440&&overlaps(t-30,t))?tr(' · booked',' · محجوز'):''}</button>;}))}</div>:<p className="avail-times-empty">{tr('Choose a free day to set a time.','اختر يوماً متاحاً لتحديد الوقت.')}</p>)}


    </div>);

 // Account contact details are read-only in the booking.
 const nameParts={first:ctx?.order.customer?.firstName??'',last:ctx?.order.customer?.lastName??''};
 const personalFields=(<div className="avail-venue-fields" role="group" aria-label={tr(...stepLabel('customer'))}>
  <span className="avail-kicker"><FieldCode code={bookingAtomRange(EVENT_PAGE_STEPS.personal)}/>{tr('CONTACT','التواصل')}</span>
  {signedIn?<p className="booking-field-hint personal-info-note">{tr('Your name, email, phone and company must be edited in your dashboard under Personal info.','يجب تعديل الاسم والبريد الإلكتروني والهاتف والشركة في قسم المعلومات الشخصية بلوحة حسابك.')} <a className="echo-link" href="/dashboard/profile">{tr('Edit personal information →','تعديل المعلومات الشخصية ←')}</a></p>
   :<p className="booking-field-hint personal-info-note">{tr('Before your booking is sent you create your account and confirm your email with a code. Your details here are saved to it.','قبل إرسال حجزك تنشئ حسابك وتؤكد بريدك برمز. تُحفظ تفاصيلك هنا فيه.')}</p>}
  <div className="avail-venue-pair">
   <input {...bookingAtomInputProps('customer.firstName',ctx?.order)} type="text" autoComplete="given-name" disabled={!canEdit} placeholder={fieldName('customer.firstName',ar)+requiredMark('customer.firstName')} aria-label={fieldName('customer.firstName',ar)+requiredNote('customer.firstName',ar)} value={nameParts.first} readOnly={signedIn} onChange={event=>ctx?.setField('customer.firstName',event.target.value||null)}/>
   <input {...bookingAtomInputProps('customer.lastName',ctx?.order)} type="text" autoComplete="family-name" disabled={!canEdit} placeholder={fieldName('customer.lastName',ar)+requiredMark('customer.lastName')} aria-label={fieldName('customer.lastName',ar)+requiredNote('customer.lastName',ar)} value={nameParts.last} readOnly={signedIn} onChange={event=>ctx?.setField('customer.lastName',event.target.value||null)}/>
  </div>
  <div className="avail-venue-pair">
   <input {...bookingAtomInputProps('customer.email',ctx?.order)} type="email" autoComplete="email" disabled={!canEdit} placeholder={fieldName('customer.email',ar)+requiredMark('customer.email')} aria-label={fieldName('customer.email',ar)+requiredNote('customer.email',ar)} value={emailText??ctx?.order.customer?.email??''} readOnly={signedIn} onChange={event=>{const text=event.target.value.trim();setEmailText(text);/* the draft only accepts a complete address; typing continues meanwhile */if(!text||/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))ctx?.setField('customer.email',text||null);}}/>
   <CanadianPhoneInput {...bookingAtomInputProps('customer.phone',ctx?.order)} autoComplete="tel" disabled={!canEdit} placeholder={tr('Phone number','رقم الهاتف')+requiredMark('customer.phone')} aria-label={tr('Phone number','رقم الهاتف')+requiredNote('customer.phone',ar)} value={ctx?.order.customer?.phone??''} readOnly={signedIn} onChange={value=>ctx?.setField('customer.phone',value||null)}/>
  </div>
  <select {...bookingAtomInputProps('customer.contactMethod',ctx?.order)} aria-label={tr('How should we reach you?','كيف نتواصل معك؟')+requiredNote('customer.contactMethod',ar)} disabled={!canEdit||signedIn||choices.enabled.length===0} value={ctx?.order.customer?.contactMethod||''} onChange={e=>ctx?.setField('customer.contactMethod',e.target.value||null)}><option value="">{tr('How should we reach you?','كيف نتواصل معك؟')+requiredMark('customer.contactMethod')}</option>{bookingAtom('customer.contactMethod').options.map(option=><option key={option} value={option} disabled={!choices.enabled.includes(option)}>{optionName('customer.contactMethod',option,ar)}</option>)}</select>
  {choices.hasPhone&&<fieldset className="avail-phone-contact" data-booking-field="customer.phoneContact" disabled={!canEdit||signedIn}><legend>{tr('How may we reach you on your phone?','كيف نتواصل معك على هاتفك؟')+requiredMark('customer.phoneContact')}</legend>{bookingAtom('customer.phoneContact').options.map(option=><label key={option}><input type="radio" name="phoneContact" required value={option} checked={ctx?.order.customer?.phoneContact===option} onChange={()=>ctx?.setField('customer.phoneContact',option)}/><span>{optionName('customer.phoneContact',option,ar)}</span></label>)}</fieldset>}
  <input {...bookingAtomInputProps('customer.company',ctx?.order)} type="text" autoComplete="organization" disabled={!canEdit} placeholder={tr('Company (only for business events)','الشركة (لفعاليات الشركات فقط)')} aria-label={tr('Company name, only for a business event (optional)','اسم الشركة، لفعاليات الشركات فقط (اختياري)')} value={ctx?.order.customer?.company??''} readOnly={signedIn} onChange={event=>ctx?.setField('customer.company',event.target.value||null)}/>
 </div>);

 // Reset buttons: one per form step, each behind the same confirmation as "Clear date & time".
 const filled=paths=>paths.some(path=>{const value=path.split('.').reduce((o,key)=>o?.[key],ctx?.order);return value!==null&&value!==undefined&&value!==''&&value!==false;});
 const stepReset=(title,paths,after)=>({disabled:!canEdit||!filled(paths),run:()=>setPending({title:tr(`Reset ${title}?`,`إعادة تعيين ${title}؟`),text:tr('This clears what you entered in this step. Other steps stay as they are.','سيُمسح ما أدخلته في هذه الخطوة. تبقى الخطوات الأخرى كما هي.'),apply:()=>{ctx?.editDraft(paths.map(path=>({path,value:null})));after?.();}})});
 const resetLabel=tr('Reset','إعادة تعيين');
 // "Update" refreshes Personal info from the account (the dashboard profile); it never edits it. Visitors without an account type their details instead.
 // Arriving from the 3D Room ("Change" next to the guest count): scroll to the guest field and put the cursor in it.
 useEffect(()=>{if(window.location.hash!=='#booking-guests')return undefined;const timer=setTimeout(()=>{const row=document.getElementById('booking-guests');row?.scrollIntoView({block:'center',behavior:'smooth'});row?.querySelector('input')?.focus({preventScroll:true});},400);return()=>clearTimeout(timer);},[]);
 const [refreshing,setRefreshing]=useState(false);
 // What can be chosen follows Personal info: nothing until an email or phone is entered, then only what exists; with a single one entered it is chosen for the client.
 const contactMethod_=ctx?.order.customer?.contactMethod;
 // A phone contact option only exists while there is a phone number: clearing the number clears it too, so the order never keeps an answer to a question that is no longer asked.
 useEffect(()=>{if(canEdit&&!signedIn&&!choices.hasPhone&&ctx?.order.customer?.phoneContact)ctx?.setField('customer.phoneContact',null);},[canEdit,signedIn,choices.hasPhone,ctx?.order.customer?.phoneContact]);// eslint-disable-line react-hooks/exhaustive-deps
 useEffect(()=>{if(!canEdit||signedIn)return;const current=contactMethod_||null;if(choices.only&&current!==choices.only)ctx?.setField('customer.contactMethod',choices.only);else if(!choices.enabled.length&&current)ctx?.setField('customer.contactMethod',null);else if(current&&choices.enabled.length&&!choices.enabled.includes(current))ctx?.setField('customer.contactMethod',null);},[canEdit,signedIn,choices.only,choices.enabled.join(),contactMethod_]);// eslint-disable-line react-hooks/exhaustive-deps
 const updatePersonal={disabled:refreshing,run:async()=>{if(!signedIn){document.querySelector('[data-booking-field="customer.firstName"]')?.focus();return;}const refresh=ctx?.importAccountDetails||ctx?.auth?.onRefreshAccount;if(!refresh)return;setRefreshing(true);try{await refresh();}catch{/* The form keeps what it shows. */}finally{setRefreshing(false);}}};
 const resetEvent=stepReset(tr('event type','نوع الفعالية'),EVENT_PAGE_STEPS.occasion);
 const resetGuests=stepReset(tr('guest count','عدد الضيوف'),EVENT_PAGE_STEPS.guests);
 const resetVenue=stepReset(tr('venue','المكان'),VENUE_RESET_PATHS,()=>{setMapShown(false);setManualAddress(false);setVenueSearch({open:false,busy:false,error:'',items:[],notFound:false});});
 const resetDate={disabled:!canEdit||!(sharedDate||sharedStart||sharedEnd),run:()=>setPending({title:tr('Reset date & time?','إعادة تعيين التاريخ والوقت؟'),text:tr('You can choose another day afterwards.','يمكنك اختيار يوم آخر بعد ذلك.'),apply:clearDay})};
 // Signed-out visitors see the page blurred behind a sign in / create account prompt.
 const guestFields=(<div id="booking-guests" className="avail-guests-row"><span className="avail-kicker"><FieldCode k="event.guestCount"/>{tr('GUESTS','الضيوف')+requiredMark('event.guestCount')}</span><label className="event-type-guests"><Users size={17} strokeWidth={1.6} aria-hidden="true"/><input {...bookingAtomInputProps('event.guestCount',ctx?.order)} type="number" inputMode="numeric" disabled={!canEdit} placeholder={tr('Number of guests','عدد الضيوف')+requiredMark('event.guestCount')} aria-label={tr('Number of guests','عدد الضيوف')+requiredNote('event.guestCount',ar)} value={ctx?.order.event?.guestCount??''} onChange={event=>{const raw=event.target.value;ctx?.setField('event.guestCount',raw===''?null:Number(raw));}}/></label></div>);
 const venueFields=(<div className="avail-venue-fields" role="group" aria-label={fieldName('event.venue.name',ar)}>
      <span className="avail-kicker"><FieldCode code={bookingAtomRange(EVENT_PAGE_STEPS.venue)}/>{tr('VENUE','المكان')}</span>
      {[['name',tr('Venue name','اسم المكان')+requiredMark('event.venue.name'),'organization'],['address',tr('Street address','العنوان')+requiredMark('event.venue.address'),'street-address']].map(([key,label,auto])=><Clearable key={key} clear={key==='name'&&canEdit?()=>{ctx?.editDraft([{path:'event.venue.name',value:null},...(pinNow?PLACE_PATHS.map(path=>({path,value:null})):[])]);setMapShown(false);setVenueSearch({open:false,busy:false,error:'',items:[],notFound:false});}:null} show={Boolean(ctx?.order.event?.venue?.name)} label={tr('Clear venue name','مسح اسم المكان')}><input data-booking-field={'event.venue.'+key} type="text" autoComplete={auto} maxLength={bookingAtom('event.venue.'+key).maxLength} disabled={!canEdit} placeholder={label} aria-label={label} value={ctx?.order.event?.venue?.[key]??''} onChange={event=>{if(key==='name'){/* A typed address is never wiped; only an address that came from a picked result goes when the name changes. */ctx?.editDraft([{path:'event.venue.name',value:event.target.value||null},...(pinNow?PLACE_PATHS.map(path=>({path,value:null})):[])]);searchVenue('name',event.target.value,addrManual);}else ctx?.setField('event.venue.'+key,event.target.value||null);}}/></Clearable>)}
      <input {...bookingAtomInputProps('event.venue.addressDetails',ctx?.order)} type="text" autoComplete="off" disabled={!canEdit} placeholder={tr('Unit # or any extra info','رقم الوحدة أو أي معلومات إضافية')} aria-label={tr('Unit number or any extra info (optional)','رقم الوحدة أو أي معلومات إضافية (اختياري)')} value={ctx?.order.event?.venue?.addressDetails??''} onChange={event=>ctx?.setField('event.venue.addressDetails',event.target.value||null)}/>
      <div className="avail-venue-pair">{[['city',fieldName('event.venue.city',ar)+requiredMark('event.venue.city')],['postalCode',fieldName('event.venue.postalCode',ar)+requiredMark('event.venue.postalCode')]].map(([key,label])=><input key={key} data-booking-field={'event.venue.'+key} type="text" autoComplete={key==='city'?'address-level2':'postal-code'} maxLength={bookingAtom('event.venue.'+key).maxLength} disabled={!canEdit} placeholder={label} aria-label={label} value={ctx?.order.event?.venue?.[key]??''} onChange={event=>ctx?.setField('event.venue.'+key,event.target.value||null)}/>)}</div>
      <label className="avail-venue-country"><select {...bookingAtomInputProps('event.venue.country',ctx?.order)} autoComplete="country-name" disabled={!canEdit} aria-label={fieldName('event.venue.country',ar)+requiredNote('event.venue.country',ar)} value={ctx?.order.event?.venue?.country??''} onChange={event=>ctx?.setField('event.venue.country',event.target.value||null)}><option value="" disabled>{fieldName('event.venue.country',ar)+requiredMark('event.venue.country')}</option>{countries.map(country=><option key={country.value} value={country.value}>{country.label}</option>)}</select></label>

      <select {...bookingAtomInputProps('event.venue.setting',ctx?.order)} aria-label={tr('Indoor or outdoor','داخلي أو خارجي')+requiredNote('event.venue.setting',ar)} disabled={!canEdit} value={ctx?.order.event?.venue?.setting||''} onChange={event=>ctx?.setField('event.venue.setting',event.target.value||null)}><option value="" disabled>{tr('Indoor or outdoor','داخلي أو خارجي')+requiredMark('event.venue.setting')}</option>{bookingAtom('event.venue.setting').options.map(option=><option key={option} value={option}>{optionName('event.venue.setting',option,ar)}</option>)}</select>
      {venueSearch.notFound&&<p className="avail-venue-hint" role="status">{tr('No matching place found. Complete the address manually.','لم يتم العثور على مكان مطابق. أكمل العنوان يدوياً.')}</p>}
     </div>);
 // Venue suggestions take the place of the step's paragraph while a search is open.
 const venueResults=(<div className="avail-venue-dropdown is-inline" role="region" aria-label={tr('Venue suggestions','اقتراحات الأماكن')} aria-live="polite">
       {venueSearch.busy?<p className="avail-venue-note" role="status"><i aria-hidden="true"/>{tr('Searching venues…','جارٍ البحث عن الأماكن…')}</p>:venueSearch.error?<p className="avail-venue-note" role="alert">{venueSearch.error}</p>:!venueSearch.items.length?<p className="avail-venue-note">{tr('No matching places found. Try a shorter name, or use the button below to enter the address yourself.','لا توجد نتائج مطابقة. جرّب اسماً أقصر، أو استخدم الزر في الأسفل لإدخال العنوان بنفسك.')}</p>:null}
       <ul className="avail-venue-grid">{uniqueVenues(venueSearch.items).map((item,index)=><li key={item.id||item.sourceId||`${item.name}|${item.address}`} style={{'--i':index+1}}><button type="button" onClick={()=>chooseVenue(item)}>{(()=>{const p=venueAddressParts(item);return <><strong>{p.name}</strong><span className="avail-venue-lines">{[p.street,p.cityProvince,p.postalCountry].filter(Boolean).map(line=><span key={line}>{line}</span>)}</span></>;})()}</button></li>)}</ul><footer className="avail-venue-footer"><button type="button" onClick={()=>{setManualAddress(true);setMapShown(false);setVenueSearch({open:false,busy:false,error:'',items:[],notFound:false});requestAnimationFrame(()=>shell.current?.querySelector('[data-booking-field="event.venue.address"]')?.focus());}}><strong>{tr('Can’t find the venue address','لا أجد عنوان المكان')}</strong><span className="avail-venue-lines"><span>{tr('Click here and type the address yourself.','اضغط هنا واكتب العنوان بنفسك.')}</span></span></button></footer></div>);

 // After a venue is chosen the map replaces the results, with the pin and the address on it.
 const chosen=ctx?.order.event?.venue,hasPin=Number.isFinite(chosen?.latitude)&&Number.isFinite(chosen?.longitude);
 const pinned=hasPin?[{...chosen,venueType:'other',source:chosen.source||'manual'}]:[];
 const venueMapView=(<div className="booking-venue-mapview"><Suspense fallback={<p className="booking-venue-mapnote" role="status">{tr('Loading venue map…','جارٍ تحميل الخريطة…')}</p>}><VenueMapCanvas items={pinned} searchResults={[]} selected={pinned[0]} draft={null} picking={false} focusZoom={15} onPick={()=>{}} onSelect={()=>{}} onCenter={()=>{}}/></Suspense>
  <div className="booking-venue-pincard" role="status"><strong>{chosen?.name}</strong><span>{[chosen?.address,chosen?.city,chosen?.postalCode].filter(Boolean).join(', ')}</span></div></div>);
 const order=ctx?.order||{},event=order.event||{};
// Edit: scroll to the step that owns the field and focus its first control.
 return <section id="availability" ref={shell} className="echo-section home-availability booking-journey" aria-label={tr('Plan your event','خطط لفعاليتك')} dir={ar?'rtl':'ltr'}>
  <div className="booking-journey-inner">
   <SubmittedBookingNotice ar={ar}/>
   {editNote&&<p className="avail-edit-note" role="status" data-loading-draft={!ctx?.cloudReady?'':undefined}>{editNote}</p>}

   <PhaseHeading id="personal" ar={ar}/>
   <BookingStep number={1} onReset={updatePersonal} resetLabel={refreshing?tr('Refreshing…','جارٍ التحديث…'):tr('Get your info','جلب معلوماتك')} ResetIcon={RefreshCw} title={tr('Who are we planning with?','مع من نخطط؟')} cardTitle={<>{tr('Your details','بياناتك')}</>} copy={signedIn?tr('These contact details come from your account. To update them, visit Personal info in your dashboard. Choose how we should reach you below.','معلومات التواصل مأخوذة من حسابك. لتعديلها، افتح المعلومات الشخصية في لوحة حسابك. اختر أدناه طريقة التواصل المفضلة.'):tr('Tell us who to reach and how. Before your booking is sent you create your account and confirm your email with a code.','أخبرنا بمن نتواصل معه وكيف. قبل إرسال حجزك تنشئ حسابك وتؤكد بريدك الإلكتروني برمز.')}>
    {personalFields}
   </BookingStep>
   <PhaseHeading id="event" ar={ar}/>
   <BookingStep number={2} onReset={resetEvent} resetLabel={resetLabel} title={tr('What are we celebrating?','بماذا نحتفل؟')} cardTitle={<>{tr('Choose your event','اختر نوع فعاليتك')}</>} copy={tr('A wedding, a milestone, or a night with your team—each occasion has its own rhythm. Choose the closest match so Echo can shape the music, sound, lighting, and key moments around your celebration. Choose Other if your plans don’t fit a category.','لكل مناسبة إيقاعها، من الزفاف إلى الإنجازات واللقاءات مع فريقك. اختر النوع الأقرب لخططك كي ننسّق الموسيقى والصوت والإضاءة ولحظات الحفل بما يناسب احتفالك. اختر «أخرى» إن لم تجد النوع المناسب.')}>
    <EventTypeColumn ar={ar}/>
    {bookingAtomApplies(ctx?.order,'event.title')&&<label className="booking-field"><span><FieldCode k="event.title"/>{tr('What type of event is it?','ما نوع فعاليتك؟')}{bookingAtomRequired(ctx?.order,'event.title')?' *':''}</span><input {...bookingAtomInputProps('event.title',ctx?.order)} disabled={!canEdit} value={event?.title||''} onChange={e=>ctx?.setField('event.title',e.target.value||null)} placeholder={tr('Describe your event type','صف نوع فعاليتك')}/></label>}
   </BookingStep>
   <BookingStep number={3} onReset={resetDate} resetLabel={resetLabel} title={tr('Find your moment.','اختر الموعد المناسب.')} cardTitle={<>{tr('Date & time','التاريخ والوقت')}</>} copy={tr('Pick an available day, then tell us when your event starts and ends. Include the moments you want us there for, from the first welcome to the last song. Times are shown in Toronto time, and your event can end after midnight. Availability is confirmed when Echo accepts your booking.','اختر يوماً متاحاً، ثم حدّد وقت بداية الفعالية ونهايتها. أخبرنا بالمدة التي تحتاجنا خلالها، من الترحيب الأول إلى الأغنية الأخيرة. جميع الأوقات بتوقيت تورونتو، ويمكن أن تنتهي الفعالية بعد منتصف الليل. يُؤكّد التوفر عند قبول Echo لحجزك.')}>
   <fieldset className="booking-lock" disabled={!canEdit}>
    <div id="booking-date">
     <span className="avail-kicker booking-date-required-label"><FieldCode k="event.date"/>{tr('EVENT DATE','تاريخ الفعالية')+requiredMark('event.date')}</span>
     <div className="avail-navigation"><div className="avail-period"><button type="button" aria-label={tr('Previous month','الشهر السابق')} onClick={()=>move(-1)}><ChevronLeft size={17}/><span>{adjacentMonth(-1)}</span></button><h3>{title}</h3><button type="button" aria-label={tr('Next month','الشهر التالي')} onClick={()=>move(1)}><span>{adjacentMonth(1)}</span><ChevronRight size={17}/></button></div><div><button type="button" onClick={()=>setFocus(today)}>{tr('Today','اليوم')}</button><select aria-label={tr('Choose year','اختر السنة')} value={year} onChange={event=>{const next=parse(focus);next.setDate(1);next.setFullYear(Number(event.target.value));setFocus(dateKey(next));}}>{Array.from({length:maxYear-minYear+1},(_,i)=><option key={i} value={minYear+i}>{minYear+i}</option>)}</select><button type="button" aria-label={tr('Refresh availability','تحديث المواعيد')} onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={14}/></button></div></div>
     {calendar}
     <div className="booking-calendar-note"><span>{tr('Available','متاح')}</span><small>{tr('Your date is reserved only after confirmation.','لا يُحجز موعدك إلا بعد التأكيد.')}</small></div>
     <div className="booking-time-fields">{timeOpen?timeFields:<p className="booking-field-hint">{tr('Choose a day above to select your start and end times.','اختر يوماً أعلاه لتحديد وقت البداية والنهاية.')}</p>}</div>
     {sharedDate&&<button type="button" className="booking-clear-date" onClick={()=>setPending({title:tr('Clear your date and time?','مسح الموعد والوقت؟'),text:tr('You can choose another day afterwards.','يمكنك اختيار يوم آخر بعد ذلك.'),apply:clearDay})}>{tr('Clear date & time','مسح التاريخ والوقت')}</button>}
    </div>
   </fieldset>
   </BookingStep>
   <BookingStep number={4} onReset={resetGuests} resetLabel={resetLabel} title={tr('Make room for everyone.','مساحة لكل ضيوفك.')} cardTitle={<>{tr('Your guest list','عدد الضيوف')}</>} copy={tr('An estimated guest count is a great place to start. It helps us recommend a sound system that reaches the whole room and a setup that suits your crowd. You can update the number as your guest list comes together.','يكفينا عدد تقريبي في البداية. يساعدنا ذلك على اقتراح نظام صوت يغطي المكان وتجهيزات تناسب الحضور. يمكنك تعديل العدد كلما اكتملت قائمة ضيوفك.')}>
    {guestFields}
    <p className="booking-field-hint">{tr('A best estimate is fine for now.','يكفي تقدير تقريبي حالياً.')}</p>
   </BookingStep>
   <BookingStep number={5} onReset={resetVenue} resetLabel={resetLabel} title={tr('Set the scene.','أخبرنا عن المكان.')} cardTitle={<>{tr('Where is it happening?','أين ستقام الفعالية؟')}</>} copy={venueSearch.open?venueResults:mapShown&&hasPin?venueMapView:tr('Tell us where to bring the experience. The address and indoor or outdoor setting help us plan delivery and equipment. Type the venue name to search, or enter the address yourself.','أخبرنا أين تريد إقامة الفعالية. يساعدنا العنوان وما إذا كان المكان داخلياً أو خارجياً على تخطيط النقل والتجهيزات. اكتب اسم المكان للبحث، أو أدخل العنوان بنفسك.')}>
    <div id="booking-venue">{venueFields}
    </div>
   </BookingStep>

  </div>
 {pending&&<div className="avail-confirm-backdrop" role="presentation" onKeyDown={event=>{if(event.key==='Escape')setPending(null);}}><div className="avail-confirm" role="alertdialog" aria-modal="true" aria-labelledby="avail-confirm-title" aria-describedby="avail-confirm-text"><h3 id="avail-confirm-title">{pending.title||tr('Change your date or time?','تغيير الموعد؟')}</h3><p id="avail-confirm-text">{pending.text}</p><div className="avail-confirm-actions"><button type="button" autoFocus onClick={()=>setPending(null)}>{tr('Keep current','إبقاء الحالي')}</button><button type="button" className="is-danger" onClick={()=>{const apply=pending.apply;setPending(null);apply();}}>{tr('Yes, change','نعم، غيّر')}</button></div></div></div>}
 </section>;
}
