import {useEffect,useRef,useState} from 'react';
import DjBookingForm from './DjBookingForm';
import {ArrowDown,Check,Plus} from 'lucide-react';
import {djServiceChanges} from '../lib/bookingFlow.mjs';
import {useEventOrder} from './eventOrderContext';
import {useFillViewport} from './useFillViewport';
import './rentalsHero.css';

// First viewport of the Services page: the character, centred, over a CSS-only night-street bokeh backdrop with film grain.
// The rental workbench starts in the next viewport.
export default function RentalsHero({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,hero=useRef(null),form=useRef(null),[prefs,setPrefs]=useState(()=>{const field=new URLSearchParams(window.location.search).get('field')||'';return field.startsWith('music.')&&!['music.mcRequested','music.djMc'].includes(field);}),order=useEventOrder(),djAdded=Boolean(order?.order.services?.includes('dj'));
  useFillViewport(hero);
  const calm=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const showForm=()=>{setPrefs(true);requestAnimationFrame(()=>requestAnimationFrame(()=>form.current?.scrollIntoView({behavior:calm()?'auto':'smooth',block:'start'})));};
  const closeForm=()=>{setPrefs(false);requestAnimationFrame(()=>hero.current?.scrollIntoView({behavior:calm()?'auto':'smooth',block:'start'}));};
  useEffect(()=>{if(!prefs)return undefined;requestAnimationFrame(()=>form.current?.scrollIntoView({behavior:calm()?'auto':'smooth',block:'start'}));const key=event=>{if(event.key==='Escape')closeForm();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[prefs]);// eslint-disable-line react-hooks/exhaustive-deps
  // Same action as the DJ Khalil Service card: add the DJ service to the booking, then go to the services below to shape it.
  const down=event=>{event?.preventDefault();document.getElementById('services')?.scrollIntoView({behavior:window.matchMedia?.('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});};
  const add=()=>{
    if(order&&!djAdded)djServiceChanges(order.order,'dj').forEach(({path,value})=>order.setField(path,value));
    showForm();
  };
  return <>
    <div className="rentals-backdrop" aria-hidden="true"/>
    <section ref={hero} className="rentals-hero" aria-labelledby="rentals-hero-title" dir={ar?'rtl':'ltr'}>
      <div className="rentals-bokeh" aria-hidden="true">{Array.from({length:14},(_,i)=><i key={i}/>)}</div>
      <div className="rentals-hero-copy">
        <p className="rentals-hero-kicker">{tr('The heart of Echo','قلب إيكو')}</p>
        <h1 id="rentals-hero-title">{tr('DJ Khalil Service','خدمة دي جي خليل')}</h1>
        <p className="rentals-hero-text">{tr('Music shaped around your event: a DJ who reads the room, MC hosting when you need a voice, and the sound, lighting and effects to match. Tell us about your celebration and we’ll take it from there.','موسيقى مصمّمة على قياس مناسبتك: دي جي يقرأ أجواء القاعة، وتقديم للحفل عند الحاجة، مع الصوت والإضاءة والمؤثرات التي تناسبها. أخبرنا عن احتفالك ونتولّى الباقي.')}</p>
        {order&&<button type="button" className="rentals-hero-book" aria-pressed={djAdded} onClick={add}>{djAdded?<Check size={18} aria-hidden="true"/>:<Plus size={18} aria-hidden="true"/>}<span>{djAdded?tr('Edit music preferences','تعديل التفضيلات الموسيقية'):tr('Add to booking','أضف إلى الحجز')}</span></button>}
      </div>
      <img className="rentals-hero-photo" src="/echo/rentals-hero-khalil.webp" width="680" height="1444" alt={tr('DJ Khalil with headphones around his neck','دي جي خليل وسماعاته حول رقبته')} fetchPriority="high"/>
      <a className="rentals-hero-scroll" href="#services" onClick={down}><span>{tr('Scroll down to Services','انزل إلى الخدمات')}</span><ArrowDown size={18}/></a>
    </section>
    {prefs&&order&&<section ref={form} id="dj-service-preferences" className="rentals-hero-form rentals-preferences" aria-label={tr('DJ music preferences','تفضيلات موسيقى الدي جي')}><DjBookingForm ar={ar} ctx={order} djAdded onClose={closeForm} backLabel={tr('Back','رجوع')}/></section>}
  </>;
}
