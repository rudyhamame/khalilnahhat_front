import {useRef,useState} from 'react';
import {ArrowUpRight,CalendarDays,ChevronLeft,ChevronRight} from 'lucide-react';
import {calendarDays,dateKey,torontoToday} from '../lib/bookingCalendar';
import './fastBooking.css';

const TIME_SLOTS=Array.from({length:48},(_,index)=>`${String(Math.floor(index/2)).padStart(2,'0')}:${index%2?'30':'00'}`);

export default function FastBooking({lang,onContinue}) {
  const ar=lang.lang==='ar',tr=(en,arabic)=>ar?arabic:en;
  const today=torontoToday(),[year,month]=today.split('-').map(Number);
  const [view,setView]=useState(()=>new Date(year,month-1,1,12));
  const [selected,setSelected]=useState('');
  const [startTime,setStartTime]=useState(''),[endTime,setEndTime]=useState('');
  const [timeField,setTimeField]=useState('start');
  const grid=useRef(null);
  const locale=ar?'ar-CA':'en-CA';
  const chosen=selected?new Date(`${selected}T12:00:00`):null;
  const monthLabel=new Intl.DateTimeFormat(locale,{month:'long'}).format(view);
  const previousDisabled=view.getFullYear()===year&&view.getMonth()===month-1;
  const formatTime=value=>value?new Intl.DateTimeFormat(locale,{hour:'numeric',minute:'2-digit',hour12:true,timeZone:'UTC'}).format(new Date(`2000-01-01T${value}:00Z`)):tr('Choose','اختر');
  const pickTime=slot=>{
    if(timeField==='start'){setStartTime(slot);if(endTime===slot)setEndTime('');setTimeField('end');}
    else setEndTime(slot);
  };
  const move=delta=>setView(value=>new Date(value.getFullYear(),value.getMonth()+delta,1,12));
  const keyboard=(event,date)=>{
    const offsets={ArrowLeft:ar?1:-1,ArrowRight:ar?-1:1,ArrowUp:-7,ArrowDown:7};
    if(!(event.key in offsets))return;
    event.preventDefault();const next=new Date(date);next.setDate(date.getDate()+offsets[event.key]);
    if(dateKey(next)<today)return;
    setView(new Date(next.getFullYear(),next.getMonth(),1,12));
    requestAnimationFrame(()=>grid.current?.querySelector(`[data-date="${dateKey(next)}"]`)?.focus());
  };
  return <section className="echo-fast-booking is-date-time-only" aria-labelledby="fast-booking-title">
    <header className="fast-booking-heading"><div className="fast-booking-brand"><CalendarDays size={17} strokeWidth={1.5}/><span id="fast-booking-title">{tr('ECHO / EVENT PLANNER','إيكو / مخطط الفعاليات')}</span></div></header>
    <div className="fast-booking-body">
    <aside className={`fast-booking-date-slip${chosen?' has-date':''}`} aria-live="polite"><span>{tr('YOUR DATE','تاريخك')}</span><strong>{chosen?new Intl.NumberFormat(locale).format(chosen.getDate()):'—'}</strong><b>{chosen?new Intl.DateTimeFormat(locale,{month:'short'}).format(chosen):tr('PICK A DAY','اختر يوماً')}</b><small>{chosen?new Intl.DateTimeFormat(locale,{weekday:'long'}).format(chosen):view.getFullYear()}</small><CalendarDays size={15} strokeWidth={1.3} aria-hidden="true"/></aside>
    <div className="fast-calendar">
      <div className="fast-calendar-month"><h3 aria-live="polite">{monthLabel} <span>{view.getFullYear()}</span></h3><div><button type="button" disabled={previousDisabled} onClick={()=>move(-1)} aria-label={tr('Previous month','الشهر السابق')}><ChevronLeft size={14}/></button><button type="button" onClick={()=>move(1)} aria-label={tr('Next month','الشهر التالي')}><ChevronRight size={14}/></button></div></div>
      <div className="fast-calendar-week" aria-hidden="true">{Array.from({length:7},(_,index)=><span key={index}>{new Intl.DateTimeFormat(locale,{weekday:'short'}).format(new Date(2026,9,25+index,12))}</span>)}</div>
      <div className="fast-calendar-days" ref={grid} role="group" aria-label={tr('Choose your event date','اختر تاريخ فعاليتك')}>{calendarDays(view.getFullYear(),view.getMonth()).map(date=>{
        const key=dateKey(date),outside=date.getMonth()!==view.getMonth();
        return <button key={key} type="button" data-date={key} disabled={key<today||outside} className={`${outside?'is-outside ':''}${key===today?'is-today ':''}${selected===key?'is-selected':''}`} aria-label={new Intl.DateTimeFormat(locale,{dateStyle:'full'}).format(date)} aria-pressed={selected===key} aria-current={key===today?'date':undefined} onClick={()=>setSelected(key)} onKeyDown={event=>keyboard(event,date)}>{new Intl.NumberFormat(locale).format(date.getDate())}{key===today&&<i aria-hidden="true"/>}</button>;
      })}</div>
    </div>
    </div>
    <div className="fast-booking-time">
      <div className="fast-booking-time-heading"><span id="fast-booking-time-label">{tr('PICK A TIME','اختر الوقت')}</span><small>{tr('Toronto time','بتوقيت تورونتو')}</small></div>
      <div className="fast-booking-time-fields" role="group" aria-label={tr('Start and end times','وقت البداية والنهاية')}>
        <button type="button" aria-pressed={timeField==='start'} onClick={()=>setTimeField('start')}><span>{tr('1. Start','١. البداية')}</span><strong>{formatTime(startTime)}</strong></button>
        <button type="button" aria-pressed={timeField==='end'} disabled={!startTime} onClick={()=>setTimeField('end')}><span>{tr('2. End','٢. النهاية')}</span><strong>{formatTime(endTime)}</strong></button>
      </div>
      <p className="fast-booking-time-instruction" aria-live="polite">{timeField==='start'?tr('Choose the start time','اختر وقت البداية'):tr('Choose the end time','اختر وقت النهاية')}{startTime&&endTime&&endTime<startTime?tr(' · Ends the next day',' · تنتهي في اليوم التالي'):''}</p>
      <div className="fast-booking-time-slots" role="group" aria-label={timeField==='start'?tr('Start time slots','خيارات وقت البداية'):tr('End time slots','خيارات وقت النهاية')} aria-describedby="fast-booking-availability">
        {TIME_SLOTS.map(slot=><button key={slot} type="button" data-time={slot} data-time-field={timeField} disabled={timeField==='end'&&slot===startTime} aria-pressed={(timeField==='start'?startTime:endTime)===slot} onClick={()=>pickTime(slot)}>{formatTime(slot)}</button>)}
      </div>
    </div>
    {selected&&startTime&&endTime&&<button type="button" className="fast-booking-next" onClick={()=>onContinue?.({eventDate:selected,startTime,endTime})}>{tr('Continue','متابعة')}<ArrowUpRight size={16}/></button>}
    <p id="fast-booking-availability" className="fast-booking-note">{tr('Our team will confirm date and time availability.','فريقنا يؤكد توفر التاريخ والوقت.')}</p>
  </section>;
}
