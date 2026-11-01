import {useEffect,useState} from 'react';
import {Heart,Gem,Cake,Briefcase,PartyPopper,GraduationCap,CalendarHeart,Users} from 'lucide-react';
import setupDefaults from '../lib/contracts/setup-catalog.json';
import {apiRequest} from '../lib/api';
import {useEventOrder} from './eventOrderContext';
import './eventTypeColumn.css';

const EVENT_ICONS={wedding:Heart,engagement:Gem,birthday:Cake,corporate:Briefcase,party:PartyPopper,graduation:GraduationCap,other:CalendarHeart};
// "What are you planning?": picks the event type of the booking draft. Lives beside the calendar; the setup section reads the same value.
export default function EventTypeColumn({ar=false}){
  const order=useEventOrder(),tr=(en,arabic)=>ar?arabic:en;
  const [catalog,setCatalog]=useState(setupDefaults);
  useEffect(()=>{
    let alive=true;
    const refresh=()=>apiRequest('/setup-catalog').then(value=>{if(alive&&Array.isArray(value.items))setCatalog(value.items);}).catch(()=>{});
    refresh();window.addEventListener('echo:setup-catalog-changed',refresh);
    return()=>{alive=false;window.removeEventListener('echo:setup-catalog-changed',refresh);};
  },[]);
  const events=catalog.filter(item=>item.kind==='event'&&item.isActive),current=order?.order.event?.type||'';
  return <aside className="event-type-column" aria-label={tr('Events','الفعاليات')}>
    <header><span>{tr('Events','الفعاليات')}</span><small>{tr('What are you planning?','ماذا تخطط؟')}</small></header>
    <div role="group" aria-label={tr('Event type','نوع الفعالية')}>{events.map(event=>{const Icon=EVENT_ICONS[event.bookingType]||CalendarHeart,on=current===event.bookingType;
      return <button key={event.id} type="button" aria-pressed={on} onClick={()=>order?.setField('event.type',on?null:event.bookingType)}><Icon size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr(event.name,event.nameAr||event.name)}</span></button>;})}</div>
    <label className="event-type-guests"><Users size={17} strokeWidth={1.6} aria-hidden="true"/><input type="number" inputMode="numeric" min="1" max="100000" required aria-required="true" disabled={!order?.signedIn} placeholder={tr('Number of guests *','عدد الضيوف *')} aria-label={tr('Number of guests (required)','عدد الضيوف (مطلوب)')} value={order?.order.event?.guestCount??''} onChange={event=>{const raw=event.target.value;order?.setField('event.guestCount',raw===''?null:Math.min(100000,Math.max(1,Math.floor(Number(raw)))));}}/></label>
  </aside>;
}
