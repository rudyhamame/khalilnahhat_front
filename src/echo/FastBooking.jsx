import {useRef,useState} from 'react';
import {ArrowUpRight,ChevronLeft,ChevronRight} from 'lucide-react';
import {calendarDays,dateKey,torontoToday} from '../lib/bookingCalendar';
import './fastBooking.css';

export default function FastBooking({lang}) {
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  const today=torontoToday(),[year,month]=today.split('-').map(Number);
  const [view,setView]=useState(()=>new Date(year,month-1,1,12));
  const [selected,setSelected]=useState(''),[type,setType]=useState('wedding');
  const grid=useRef(null);
  const locale=ar?'ar-CA':'en-CA';
  const monthLabel=new Intl.DateTimeFormat(locale,{month:'long'}).format(view);
  const previousDisabled=view.getFullYear()===year&&view.getMonth()===month-1;
  const move=delta=>setView(value=>new Date(value.getFullYear(),value.getMonth()+delta,1,12));
  const keyboard=(event,date)=>{
    const offsets={ArrowLeft:ar?1:-1,ArrowRight:ar?-1:1,ArrowUp:-7,ArrowDown:7};
    if(!(event.key in offsets))return;
    event.preventDefault();const next=new Date(date);next.setDate(date.getDate()+offsets[event.key]);
    if(dateKey(next)<today)return;
    setView(new Date(next.getFullYear(),next.getMonth(),1,12));
    requestAnimationFrame(()=>grid.current?.querySelector(`[data-date="${dateKey(next)}"]`)?.focus());
  };
  return <section className="echo-fast-booking" aria-labelledby="fast-booking-title">
    <header className="fast-booking-heading"><div><span>{tr('FAST-TRACK YOUR EVENT','ابدأ تخطيط فعاليتك')}</span><h2 id="fast-booking-title">{tr('Start with a date.','ابدأ باختيار التاريخ.')}</h2></div><span className="fast-booking-step">01 / 02</span></header>
    <div className="fast-calendar">
      <div className="fast-calendar-month"><h3 aria-live="polite">{monthLabel} <span>{view.getFullYear()}</span></h3><div><button type="button" disabled={previousDisabled} onClick={()=>move(-1)} aria-label={tr('Previous month','الشهر السابق')}><ChevronLeft size={14}/></button><button type="button" onClick={()=>move(1)} aria-label={tr('Next month','الشهر التالي')}><ChevronRight size={14}/></button></div></div>
      <div className="fast-calendar-week" aria-hidden="true">{Array.from({length:7},(_,index)=><span key={index}>{new Intl.DateTimeFormat(locale,{weekday:'short'}).format(new Date(2026,9,25+index,12))}</span>)}</div>
      <div className="fast-calendar-days" ref={grid} role="group" aria-label={tr('Choose your event date','اختر تاريخ فعاليتك')}>{calendarDays(view.getFullYear(),view.getMonth()).map(date=>{
        const key=dateKey(date),outside=date.getMonth()!==view.getMonth();
        return <button key={key} type="button" data-date={key} disabled={key<today||outside} className={`${outside?'is-outside ':''}${key===today?'is-today ':''}${selected===key?'is-selected':''}`} aria-label={new Intl.DateTimeFormat(locale,{dateStyle:'full'}).format(date)} aria-pressed={selected===key} aria-current={key===today?'date':undefined} onClick={()=>setSelected(key)} onKeyDown={event=>keyboard(event,date)}>{new Intl.NumberFormat(locale).format(date.getDate())}{key===today&&<i aria-hidden="true"/>}</button>;
      })}</div>
    </div>
    <div className="fast-booking-details"><label htmlFor="fast-booking-type">{tr('Your occasion','نوع المناسبة')}</label><select id="fast-booking-type" value={type} onChange={event=>setType(event.target.value)}>{Object.entries(lang.t.q.eventTypes).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></div>
    <a className="fast-booking-next" href={selected?`/quote?eventDate=${selected}&eventType=${type}`:undefined} aria-disabled={!selected} onClick={event=>{if(!selected)event.preventDefault();}}>{selected?tr('Continue with this date','متابعة بهذا التاريخ'):tr('Choose your date','اختر التاريخ')}<ArrowUpRight size={16}/></a>
    <p className="fast-booking-note">{tr('Your date is confirmed after we review your event.','نؤكد التاريخ بعد مراجعة تفاصيل فعاليتك.')}</p>
  </section>;
}
