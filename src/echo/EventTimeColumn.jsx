import {useEffect,useRef} from 'react';
import {Moon} from 'lucide-react';
import './eventTimeColumn.css';

// The EVENT TIME column: one list of half-hour slots. First click sets the start, the second the end (after midnight is fine), a third starts over.
import {hhmm,toMinutes,pickSlot} from '../lib/eventTime.mjs';
const pad=n=>String(n).padStart(2,'0');
const clock=(minutes,ar)=>{const h=Math.floor(minutes/60)%24;return `${h%12||12}:${pad(minutes%60)} ${h<12?(ar?'ص':'AM'):(ar?'م':'PM')}`;};
export default function EventTimeColumn({start='',end='',onChange,ar=false,disabled=false}){
  const s=toMinutes(start),e0=toMinutes(end),e=s!==null&&e0!==null?(e0<=s?e0+1440:e0):null;
  const list=useRef(null),tr=(en,arabic)=>ar?arabic:en;
  const slots=Array.from({length:48},(_,i)=>i*30),after=s===null?[]:Array.from({length:Math.floor(s/30)},(_,i)=>1440+i*30);
  const choose=slot=>{const next=pickSlot({start:s,end:e},slot);onChange(next.start===null?'':hhmm(next.start),next.end===null?'':hhmm(next.end));};
  useEffect(()=>{if(!list.current)return;const target=s!==null?s:18*60,row=list.current.querySelector(`[data-slot="${target}"]`);if(row)list.current.scrollTop=Math.max(0,row.offsetTop-list.current.offsetTop-40);},[]);
  const status=s===null?tr('Choose the start time','اختر وقت البدء'):e===null?tr('Now choose the end time','اختر الآن وقت الانتهاء'):`${clock(s,ar)} – ${clock(e,ar)}`;
  return <div className="event-time-column" role="group" aria-label={tr('Event time','وقت الفعالية')} dir={ar?'rtl':undefined}>
    <div className="event-time-heading"><span>{tr('EVENT TIME','وقت الفعالية')}</span><span>{tr('Toronto','تورونتو')}</span></div>
    <p className="event-time-status" role="status">{status}</p>
    <ul className="event-time-list" ref={list}>
      {[...slots,...after].map(slot=>{const isStart=slot===s,isEnd=slot===e,inside=s!==null&&e!==null&&slot>s&&slot<e;
        return <li key={slot}>{slot===1440&&<div className="event-time-divider"><Moon size={12} aria-hidden="true"/>{tr('After midnight','بعد منتصف الليل')}</div>}
          <button type="button" data-slot={slot} disabled={disabled} className={`${isStart||isEnd?'is-edge':''}${inside?' is-inside':''}`} aria-pressed={isStart||isEnd} onClick={()=>choose(slot)}>
            <span>{clock(slot,ar)}</span>{isStart&&<small>{tr('Start','البدء')}</small>}{isEnd&&<small>{tr('End','الانتهاء')}</small>}
          </button></li>;})}
    </ul>
  </div>;
}
