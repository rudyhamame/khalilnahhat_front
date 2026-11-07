import {useEffect,useRef} from 'react';
import {useRentalCatalog} from '../lib/useRentalCatalog';
import {Heart,Gem,Cake,Briefcase,PartyPopper,GraduationCap,CalendarHeart} from 'lucide-react';
import {useEventOrder} from './eventOrderContext';
import './eventTypeColumn.css';

const EVENT_ICONS={wedding:Heart,engagement:Gem,birthday:Cake,corporate:Briefcase,party:PartyPopper,graduation:GraduationCap,other:CalendarHeart};
// "What are you planning?": picks the event type of the booking draft. Lives beside the calendar; the setup section reads the same value.
export default function EventTypeColumn({ar=false}){
  const order=useEventOrder(),tr=(en,arabic)=>ar?arabic:en;
  const {catalog}=useRentalCatalog();
  const events=catalog.filter(item=>item.kind==='event'&&item.isActive),current=order?.order.event?.type||'';
  const choices=useRef(null),lastHint=useRef(0),cancelHint=useRef(()=>{});
  const eventIds=events.map(event=>event.id).join('|');
  useEffect(()=>{
    let timer,animations=[];
    const cancel=()=>{clearTimeout(timer);animations.forEach(animation=>animation.cancel());animations=[];};
    cancelHint.current=cancel;
    const hint=()=>{
      // Streaming and completed transcripts can describe the same question.
      if(Date.now()-lastHint.current<6000||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
      lastHint.current=Date.now();cancel();
      // Let the existing viewport transition reveal the choices first.
      timer=setTimeout(()=>{
        const buttons=choices.current?.querySelectorAll('[data-event-choice]')||[];
        animations=Array.from(buttons,(button,index)=>{
          const base=window.getComputedStyle(button);
          return button.animate([
            {backgroundColor:base.backgroundColor,borderColor:base.borderColor,boxShadow:'0 0 0 0 transparent'},
            {backgroundColor:'rgba(230,214,172,.26)',borderColor:'#e6d6ac',boxShadow:'0 0 16px 1px rgba(230,214,172,.32)',offset:.45},
            {backgroundColor:base.backgroundColor,borderColor:base.borderColor,boxShadow:'0 0 0 0 transparent'},
          ],{duration:650,delay:index*220,easing:'ease-in-out'});
        });
      },800);
    };
    window.addEventListener('echo:event-choices-hint',hint);
    return()=>{window.removeEventListener('echo:event-choices-hint',hint);cancel();cancelHint.current=()=>{};};
  },[eventIds]);
  const work=events.find(event=>event.bookingType===current)?.galleryImages||[];
  return <aside className="event-type-column" aria-label={tr('Events','الفعاليات')}>
    <header><span>{tr('Events','الفعاليات')}</span><small>{tr('What are you planning?','ماذا تخطط؟')}</small></header>
    <div ref={choices} role="group" aria-label={tr('Event type','نوع الفعالية')}>{events.map(event=>{const Icon=EVENT_ICONS[event.bookingType]||CalendarHeart,on=current===event.bookingType;
      return <button key={event.id} data-event-choice type="button" aria-pressed={on} onClick={()=>{cancelHint.current();order?.setField('event.type',on?null:event.bookingType);}}><Icon size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr(event.name,event.nameAr||event.name)}</span></button>;})}</div>
    {work.length>0&&<div className="event-type-work" aria-label={tr('Our work','أعمالنا')}>{work.map(url=><img key={url} src={url} alt="" loading="lazy"/>)}</div>}

  </aside>;
}
