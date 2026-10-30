import {useEffect,useState} from 'react';
import {ArrowUpRight,CalendarDays,ChevronLeft,ChevronRight,RefreshCw,Check} from 'lucide-react';
import {apiRequest} from '../lib/api';
import {calendarDays,dateKey,torontoToday} from '../lib/bookingCalendar';
import {useEventOrder} from './eventOrderContext';
import {fitViewport} from './fitViewport';
import './homeAvailability.css';

const parse=key=>new Date(key+'T12:00:00');
const time=minutes=>`${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;
const freeRanges=ranges=>{let cursor=0;const free=[];for(const range of ranges){if(range.start>cursor)free.push({start:cursor,end:range.start});cursor=Math.max(cursor,range.end);}if(cursor<1440)free.push({start:cursor,end:1440});return free;};

export default function HomeAvailability({lang}){
 const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en,locale=ar?'ar-CA':'en-CA',ctx=useEventOrder(),today=torontoToday();
 const [focus,setFocus]=useState(()=>ctx?.order.event.date||today),[refresh,setRefresh]=useState(0);
 const [state,setState]=useState({status:'loading',data:null});
 const sharedDate=ctx?.order.event.date;
 useEffect(()=>{if(sharedDate)setFocus(sharedDate);},[sharedDate]);
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
 const stateOf=key=>{const booked=ranges(key);if(!booked)return 'unknown';if(key<today)return 'past';return booked.reduce((sum,range)=>sum+range.end-range.start,0)>=1440?'booked':booked.length?'partial':'free';};
 const statusLabel=key=>({unknown:tr('Unavailable','غير متاح'),past:tr('Past date','تاريخ سابق'),booked:tr('Booked all day','محجوز طوال اليوم'),partial:tr('Partly booked','محجوز جزئياً'),free:tr('Free','متاح')}[stateOf(key)]);
 const chooseDate=(key)=>{
  setFocus(key);
  if(ctx?.signedIn&&['free','partial'].includes(stateOf(key)))ctx.setField('event.date',key);
 };
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
   {dates.map(day=>{const key=dateKey(day),outside=day.getMonth()!==m,kind=stateOf(key);return <button type="button" key={key} className={`avail-date is-${kind}${outside?' is-outside':''}${key===focus?' is-selected':''}${key===today?' is-today':''}`} aria-label={`${fullDate(key)} · ${statusLabel(key)}`} aria-pressed={key===focus} onClick={()=>chooseDate(key)}><span>{day.getDate()}</span>{<small>{kind==='partial'?tr('Some hours booked','بعض الساعات محجوزة'):kind==='free'?tr('Free','متاح'):kind==='booked'?tr('Booked','محجوز'):''}</small>}{key===sharedDate&&<Check size={12}/>}</button>;})}
  </div>;
 };
 const selectedRanges=ranges(focus),available=selectedRanges?freeRanges(selectedRanges):[];
 const canChoose=ready&&focus>=today&&stateOf(focus)!=='booked';
 return fitViewport(<section id="availability" className="echo-section home-availability" aria-labelledby="availability-title" dir={ar?'rtl':'ltr'}>
  <header className="avail-section-heading"><p className="echo-eyebrow">03 / {tr('AVAILABILITY','المواعيد المتاحة')}</p><span>{tr('TORONTO TIME','بتوقيت تورونتو')} · America/Toronto</span></header>
  <div className="avail-shell">
   <header className="avail-toolbar"><div><span className="avail-kicker">{tr('FIND YOUR MOMENT','اختر موعدك')}</span><h2 id="availability-title">{tr('Make room for your night.','موعد لليلتك المميزة.')}</h2></div></header>
   <div className="avail-navigation"><div className="avail-period"><button type="button" aria-label={tr('Previous month','الشهر السابق')} onClick={()=>move(-1)}><ChevronLeft size={17}/></button><h3>{title}</h3><button type="button" aria-label={tr('Next month','الشهر التالي')} onClick={()=>move(1)}><ChevronRight size={17}/></button></div><div><button type="button" onClick={()=>setFocus(today)}>{tr('Today','اليوم')}</button><select aria-label={tr('Choose year','اختر السنة')} value={year} onChange={event=>{const next=parse(focus);next.setDate(1);next.setFullYear(Number(event.target.value));setFocus(dateKey(next));}}>{Array.from({length:maxYear-minYear+1},(_,i)=><option key={i} value={minYear+i}>{minYear+i}</option>)}</select><button type="button" aria-label={tr('Refresh availability','تحديث المواعيد')} onClick={()=>setRefresh(value=>value+1)}><RefreshCw size={14}/></button></div></div>
   <div className="avail-layout">
    <div className="avail-calendar" aria-busy={state.status==='loading'}>
     {!ready?<div className="avail-message" role="status"><CalendarDays size={28}/><p>{state.status==='error'?tr('Could not load availability. Free times cannot be confirmed.','تعذر تحميل المواعيد. لا يمكن تأكيد الأوقات المتاحة.'):tr('Loading the calendar…','جارٍ تحميل التقويم…')}</p>{state.status==='error'&&<button type="button" onClick={()=>setRefresh(value=>value+1)}>{tr('Retry','إعادة المحاولة')}</button>}</div>:monthGrid(month)}
    </div>
    <aside className="avail-day-detail" aria-label={tr('Selected day','اليوم المختار')}><span className="avail-kicker">{tr('YOUR DATE','موعدك')}</span><strong className="avail-date-number">{current.getDate()}</strong><h3>{format(focus,{month:'long',year:'numeric'})}</h3><p>{format(focus,{weekday:'long'})}</p><span className={`avail-state is-${stateOf(focus)}`}>{statusLabel(focus)}</span>
     <div className="avail-day-ranges"><h4>{tr('Booked hours','الساعات المحجوزة')}</h4>{selectedRanges?selectedRanges.length?selectedRanges.map(range=><p key={range.start}><i className="is-booked"/>{time(range.start)} – {time(range.end)}</p>):<p>{tr('No confirmed bookings','لا توجد حجوزات مؤكدة')}</p>:<p>{tr('Schedule unavailable','الجدول غير متاح')}</p>}<h4>{tr('Free hours','الساعات المتاحة')}</h4>{ready&&focus>=today?available.map(range=><p key={range.start}><i/>{time(range.start)} – {time(range.end)}</p>):<p>—</p>}</div>
     <button type="button" className="avail-use-date" disabled={!canChoose} onClick={()=>{if(ctx?.signedIn){ctx.setField('event.date',focus);ctx.begin('ai');}else ctx?.begin('ai');}}>{sharedDate===focus?tr('Continue planning','تابع التخطيط'):tr('Plan this date','خطط لهذا الموعد')}<ArrowUpRight size={15}/></button>
    </aside>
   </div>
   <div className="avail-footer"><div className="avail-legend"><span><i/>{tr('Free','متاح')}</span><span><i className="is-partial"/>{tr('Partly booked','محجوز جزئياً')}</span><span><i className="is-booked"/>{tr('Booked','محجوز')}</span></div><p>{tr('Confirmed bookings only. Availability is subject to final confirmation.','الحجوزات المؤكدة فقط. تخضع المواعيد للتأكيد النهائي.')}</p></div>
  </div>
 </section>);
}
