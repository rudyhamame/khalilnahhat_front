import {useEffect,useRef,useState} from 'react';
import DjBookingForm from './DjBookingForm';
import BookingStep from './BookingStep';
import {FieldCode} from './BookingPhases';
import {ArrowDown,Disc3} from 'lucide-react';
import {djServiceChanges} from '../lib/bookingFlow.mjs';
import {useEventOrder} from './eventOrderContext';
import './rentalsHero.css';

// Step 03, DJ Khalil Service: the same step layout as the event steps. The hero asks whether the client wants this service (or skips to the other services); "yes" opens the music preferences in the card.
export default function RentalsHero({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,form=useRef(null),[prefs,setPrefs]=useState(()=>{const field=new URLSearchParams(window.location.search).get('field')||'';return field.startsWith('music.')&&!['music.mcRequested','music.djMc'].includes(field);}),[skipped,setSkipped]=useState(false),order=useEventOrder(),djAdded=Boolean(order?.order.services?.includes('dj')),locked=!order?.draftEditable;
  const calm=()=>window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  const scrollTo=id=>requestAnimationFrame(()=>document.getElementById(id)?.scrollIntoView({behavior:calm()?'auto':'smooth',block:'start'}));
  useEffect(()=>{if(prefs)scrollTo('dj-service-preferences');},[prefs]);
  // Yes: add the DJ service to the booking and open the music preferences.
  const yes=()=>{
    if(order&&!djAdded)djServiceChanges(order.order,'dj').forEach(({path,value})=>order.setField(path,value));
    setSkipped(false);setPrefs(true);
  };
  // Skip: go on to the other services without adding the DJ service.
  const skip=()=>{setSkipped(true);setPrefs(false);scrollTo('booking-phase-4');};
  const closeForm=()=>{setPrefs(false);scrollTo('booking-step-6');};
  const yesOn=djAdded||prefs;
  return <>
    <img className="dj-service-hero" src="/echo/dj-service-hero.webp" width="1536" height="1024" alt={tr('A DJ at the decks, headphones on, mixing a live set','دي جي خلف الأجهزة يضع السماعات ويمزج مجموعة حيّة')} loading="lazy"/>
  <BookingStep number={6} className={`dj-service-step${prefs&&order?' is-prefs-open':''}`} title={tr('Would you like DJ Khalil at your event?','هل تريد دي جي خليل في فعاليتك؟')} cardTitle={tr('Your choice','اختيارك')}
    copy={tr('Music shaped around your event: a DJ who reads the room, MC hosting when you need a voice, and the sound, lighting and effects to match. Tell us if you want this service, or skip it and go straight to the other services.','موسيقى مصمّمة على قياس مناسبتك: دي جي يقرأ أجواء القاعة، وتقديم للحفل عند الحاجة، مع الصوت والإضاءة والمؤثرات التي تناسبها. أخبرنا إن كنت تريد هذه الخدمة، أو تجاوزها إلى بقية الخدمات.')}>
    <aside className="event-type-column dj-choice">
      <span className="avail-kicker"><FieldCode code="03.01"/>{tr('DJ SERVICE *','خدمة الدي جي *')}</span>
      <div role="group" aria-label={tr('DJ Khalil service','خدمة دي جي خليل')}>
        <button type="button" data-event-choice disabled={locked} aria-pressed={yesOn} onClick={yes}><Disc3 size={17} strokeWidth={1.6} aria-hidden="true"/><span>{djAdded?tr('Yes, edit music preferences','نعم، تعديل التفضيلات الموسيقية'):tr('Yes, add the DJ service','نعم، أضف خدمة الدي جي')}</span></button>
        <button type="button" data-event-choice disabled={locked} aria-pressed={skipped&&!yesOn} onClick={skip}><ArrowDown size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr('Skip, show other services','تخطَّ، اعرض الخدمات الأخرى')}</span></button>
      </div>
    </aside>
    {prefs&&order&&<section ref={form} id="dj-service-preferences" className="rentals-hero-form rentals-preferences" aria-label={tr('DJ music preferences','تفضيلات موسيقى الدي جي')}><DjBookingForm ar={ar} ctx={order} djAdded onClose={closeForm} backLabel={tr('Back','رجوع')}/></section>}
  </BookingStep></>;
}
