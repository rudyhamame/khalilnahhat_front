import {useRentalCatalog} from '../lib/useRentalCatalog';
import {Heart,Gem,Cake,Briefcase,PartyPopper,GraduationCap,CalendarHeart,Users} from 'lucide-react';
import {useEventOrder} from './eventOrderContext';
import './eventTypeColumn.css';

const EVENT_ICONS={wedding:Heart,engagement:Gem,birthday:Cake,corporate:Briefcase,party:PartyPopper,graduation:GraduationCap,other:CalendarHeart};
// "What are you planning?": picks the event type of the booking draft. Lives beside the calendar; the setup section reads the same value.
export default function EventTypeColumn({ar=false}){
  const order=useEventOrder(),tr=(en,arabic)=>ar?arabic:en;
  const {catalog}=useRentalCatalog();
  const events=catalog.filter(item=>item.kind==='event'&&item.isActive),current=order?.order.event?.type||'';
  const work=events.find(event=>event.bookingType===current)?.galleryImages||[];
  return <aside className="event-type-column" aria-label={tr('Events','الفعاليات')}>
    <header><span>{tr('Events','الفعاليات')}</span><small>{tr('What are you planning?','ماذا تخطط؟')}</small></header>
    <div role="group" aria-label={tr('Event type','نوع الفعالية')}>{events.map(event=>{const Icon=EVENT_ICONS[event.bookingType]||CalendarHeart,on=current===event.bookingType;
      return <button key={event.id} type="button" aria-pressed={on} onClick={()=>order?.setField('event.type',on?null:event.bookingType)}><Icon size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr(event.name,event.nameAr||event.name)}</span></button>;})}</div>
    {work.length>0&&<div className="event-type-work" aria-label={tr('Our work','أعمالنا')}>{work.map(url=><img key={url} src={url} alt="" loading="lazy"/>)}</div>}
    <label className="event-type-guests"><Users size={17} strokeWidth={1.6} aria-hidden="true"/><input type="number" inputMode="numeric" min="1" max="100000" required aria-required="true" disabled={!order?.signedIn} placeholder={tr('Number of guests *','عدد الضيوف *')} aria-label={tr('Number of guests (required)','عدد الضيوف (مطلوب)')} value={order?.order.event?.guestCount??''} onChange={event=>{const raw=event.target.value;order?.setField('event.guestCount',raw===''?null:Math.min(100000,Math.max(1,Math.floor(Number(raw)))));}}/></label>
  </aside>;
}
