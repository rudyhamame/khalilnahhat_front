import {useEffect,useRef} from 'react';
import './eventTimeColumn.css';

// The EVENT TIME column: one list of half-hour slots. First click sets the start, the second the end (after midnight is fine), a third starts over.
import {hhmm,toMinutes,pickSlot,slotInside} from '../lib/eventTime.mjs';
const pad=n=>String(n).padStart(2,'0');
const clock=(minutes,ar)=>{const h=Math.floor(minutes/60)%24;return `${h%12||12}:${pad(minutes%60)} ${h<12?(ar?'ص':'AM'):(ar?'م':'PM')}`;};
export default function EventTimeColumn({start='',end='',onChange,ar=false,disabled=false}){
  const s=toMinutes(start),e0=toMinutes(end),e=s!==null&&e0!==null?(e0<=s?e0+1440:e0):null;
  const list=useRef(null),tr=(en,arabic)=>ar?arabic:en;
  const slots=Array.from({length:48},(_,i)=>i*30),copies=[0,1,2];
  const choose=slot=>{const next=pickSlot({start:s,end:e},slot);onChange(next.start===null?'':hhmm(next.start),next.end===null?'':hhmm(next.end));};
  // A loop: three copies of the day; whenever the scroll leaves the middle copy it jumps back by exactly one day.
  const recenter=()=>{const el=list.current;if(!el)return;const day=el.scrollHeight/3;if(el.scrollTop<day*.5)el.scrollTop+=day;else if(el.scrollTop>day*1.5)el.scrollTop-=day;};
  useEffect(()=>{const el=list.current;if(!el)return;const day=el.scrollHeight/3,target=s!==null?s:18*60,row=el.querySelector(`[data-copy="1"][data-slot="${target}"]`);el.scrollTop=row?Math.max(0,row.offsetTop-el.offsetTop-40):day;},[]);
  const status=s===null?tr('Choose the start time','اختر وقت البدء'):e===null?tr('Now choose the end time','اختر الآن وقت الانتهاء'):`${clock(s,ar)} – ${clock(e,ar)}`;
  return <div className="event-time-column" role="group" aria-label={tr('Event time','وقت الفعالية')} dir={ar?'rtl':undefined}>
    <div className="event-time-heading"><span>{tr('EVENT TIME','وقت الفعالية')}</span><span>{tr('Toronto','تورونتو')}</span></div>
    <p className="event-time-status" role="status">{status}</p>
    <ul className="event-time-list" ref={list} onScroll={recenter}>
      {copies.flatMap(copy=>slots.map(slot=>{const isStart=slot===s,isEnd=e!==null&&slot===e%1440,inside=slotInside(slot,s,e);
        return <li key={`${copy}-${slot}`} aria-hidden={copy!==1||undefined}>
          <button type="button" data-slot={slot} data-copy={copy} tabIndex={copy===1?0:-1} disabled={disabled} className={`${isStart||isEnd?'is-edge':''}${inside?' is-inside':''}`} aria-pressed={isStart||isEnd} onClick={()=>choose(slot)}>
            <span>{clock(slot,ar)}</span>{isStart&&<small>{tr('Start','البدء')}</small>}{isEnd&&<small>{tr('End','الانتهاء')}</small>}
          </button></li>;}))}
    </ul>
  </div>;
}
