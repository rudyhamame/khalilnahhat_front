import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import DjBookingForm from './DjBookingForm';
import {ArrowDown,Check,Plus} from 'lucide-react';
import {djServiceChanges} from '../lib/bookingFlow.mjs';
import {useEventOrder} from './eventOrderContext';
import {useFillViewport} from './useFillViewport';
import './rentalsHero.css';

// First viewport of the Services page: the character, centred, over a CSS-only night-street bokeh backdrop with film grain.
// The rental workbench starts in the next viewport.
export default function RentalsHero({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,hero=useRef(null),[prefs,setPrefs]=useState(false),[leaving,setLeaving]=useState(false),photo=useRef(null),from=useRef(null),order=useEventOrder(),djAdded=Boolean(order?.order.services?.includes('dj'));
  useFillViewport(hero);
  const calm=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  // Swap the copy and the music preferences: the outgoing side fades away, then the character glides to its new place (FLIP) while the incoming side fades in.
  const swap=next=>{
    if(calm()){setPrefs(next);return;}
    setLeaving(true);
    window.setTimeout(()=>{from.current=photo.current?.getBoundingClientRect().left??null;setLeaving(false);setPrefs(next);},260);
  };
  useEffect(()=>{if(!prefs)return undefined;const key=event=>{if(event.key==='Escape')swap(false);};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[prefs]);// eslint-disable-line react-hooks/exhaustive-deps
  useLayoutEffect(()=>{
    const node=photo.current,before=from.current;from.current=null;
    if(!node||before===null||calm())return;
    const zoom=parseFloat(getComputedStyle(document.documentElement).zoom)||1,dx=(before-node.getBoundingClientRect().left)/zoom;
    if(Math.abs(dx)>1)node.animate([{translate:`${dx}px 0`},{translate:'0 0'}],{duration:760,easing:'cubic-bezier(.2,.8,.2,1)'});
  },[prefs]);
  // Same action as the DJ Khalil Service card: add the DJ service to the booking, then go to the services below to shape it.
  const down=event=>{event?.preventDefault();document.getElementById('services')?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
  const add=()=>{
    if(order&&!djAdded)djServiceChanges(order.order,'dj').forEach(({path,value})=>order.setField(path,value));
    // The music preferences open right here in the first viewport; the character steps aside to the far end.
    swap(true);
  };
  return <>
    <div className="rentals-backdrop" aria-hidden="true"/>
    <section ref={hero} className={`rentals-hero${prefs&&order?' is-prefs':''}${leaving?' is-leaving':''}`} aria-labelledby="rentals-hero-title" dir={ar?'rtl':'ltr'}>
      <div className="rentals-bokeh" aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i}/>)}</div>
      {prefs&&order?<div className="rentals-hero-form"><DjBookingForm ar={ar} ctx={order} djAdded onClose={()=>swap(false)} backLabel={tr('Back','رجوع')}/></div>:<div className="rentals-hero-copy">
        <p className="rentals-hero-kicker">{tr('The heart of Echo','قلب إيكو')}</p>
        <h1 id="rentals-hero-title">{tr('DJ Khalil Service','خدمة دي جي خليل')}</h1>
        <p className="rentals-hero-text">{tr('Music shaped around your event: a DJ who reads the room, MC hosting when you need a voice, and the sound, lighting and effects to match. Tell us about your celebration and we’ll take it from there.','موسيقى مصمّمة على قياس مناسبتك: دي جي يقرأ أجواء القاعة، وتقديم للحفل عند الحاجة، مع الصوت والإضاءة والمؤثرات التي تناسبها. أخبرنا عن احتفالك ونتولّى الباقي.')}</p>
        {order&&<button type="button" className="rentals-hero-book" aria-pressed={djAdded} onClick={add}>{djAdded?<Check size={18} aria-hidden="true"/>:<Plus size={18} aria-hidden="true"/>}<span>{djAdded?tr('Edit music preferences','تعديل التفضيلات الموسيقية'):tr('Add to booking','أضف إلى الحجز')}</span></button>}
      </div>}
      <img ref={photo} className="rentals-hero-photo" src="/echo/rentals-hero-khalil.webp" width="680" height="1444" alt={tr('DJ Khalil with headphones around his neck','دي جي خليل وسماعاته حول رقبته')} fetchPriority="high"/>
      {!(prefs&&order)&&<a className="rentals-hero-scroll" href="#services" onClick={down}><span>{tr('Scroll down to Services','انزل إلى الخدمات')}</span><ArrowDown size={18}/></a>}
    </section>
  </>;
}
