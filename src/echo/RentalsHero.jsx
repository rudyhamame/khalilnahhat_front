import {useState} from 'react';
import {useTree,useTreeService} from '../lib/tree';
import BookingStep from './BookingStep';
import McRow from './McChoice';
import {FieldCode} from './BookingPhases';
import {ArrowDown,Disc3} from 'lucide-react';
import {djServiceChanges} from '../lib/bookingFlow.mjs';
import {rentalServices} from '../lib/numberedRentalCatalog';
import {useEventOrder} from './eventOrderContext';
import './rentalsHero.css';

// Step 03, DJ Khalil Service: the same step layout as the event steps. The hero asks whether the client wants this service (or skips to the other services); "yes" opens the music preferences in the card.
export default function RentalsHero({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,svc=useTreeService('dj',ar),mcSvc=useTreeService('mc',ar),{catalog}=useTree(),rentalNames=rentalServices(catalog).filter(row=>row.id!=='mc'&&!row.selectionField).map(row=>(ar&&row.nameAr)||row.name).join(ar?'، ':', '),[prefs,setPrefs]=useState(()=>{const field=new URLSearchParams(window.location.search).get('field')||'';return field.startsWith('music.')&&!['music.mcRequested','music.djMc'].includes(field);}),[skipped,setSkipped]=useState(false),order=useEventOrder(),djAdded=Boolean(order?.order.services?.includes('dj')),locked=!order?.draftEditable;
  // Yes: add the DJ service to the booking and open the music preferences.
  const yes=()=>{
    if(order&&!djAdded)djServiceChanges(order.order,'dj').forEach(({path,value})=>order.setField(path,value));
    setSkipped(false);setPrefs(true);// no auto-scroll to the Music Preferences sub-step
  };
  // Skip: go on to the other services without adding the DJ service.
  const skip=()=>{if(order&&djAdded)order.removeService('dj');setSkipped(true);setPrefs(false);};
  if(!svc.exists)return null; // the DJ step exists only while a `dj` service is in the catalogue
  const yesOn=prefs;// only selected when the client chooses it here, never because the DJ service was already in the booking
  return <>
    <img className="dj-service-hero" src="/echo/dj-service-hero.webp" width="1536" height="1024" alt={tr('A DJ at the decks, headphones on, mixing a live set','دي جي خلف الأجهزة يضع السماعات ويمزج مجموعة حيّة')} loading="lazy"/>
  <BookingStep number={6} className="dj-service-step" title={tr(`Would you like ${svc.name} at your event?`,`هل تريد ${svc.name} في فعاليتك؟`)} cardTitle={<>{tr(`Add ${svc.name}`,`إضافة ${svc.name}`)}</>} copy={svc.description||''}
    copy={tr(`The heart of Echo. Music shaped around your event: a DJ who reads the room${mcSvc.name?`, ${mcSvc.name} when you need a voice,`:''}${rentalNames?` and ${rentalNames} to match`:''}. Tell us if you want this service, or skip it and go straight to the other services.`,`قلب إيكو. موسيقى مصمّمة على قياس مناسبتك: دي جي يقرأ أجواء القاعة${mcSvc.name?`، و${mcSvc.name} عند الحاجة،`:''}${rentalNames?` مع ${rentalNames} بما يناسبها`:''}. أخبرنا إن كنت تريد هذه الخدمة، أو تجاوزها إلى بقية الخدمات.`)}>
    <aside className="event-type-column dj-choice">
      <span className="avail-kicker"><FieldCode k="music.djRequested"/>{svc.name.toUpperCase()} *</span>
      <div role="group" aria-label={svc.name}>
        <button type="button" data-event-choice disabled={locked} aria-pressed={yesOn} onClick={yes}><Disc3 size={17} strokeWidth={1.6} aria-hidden="true"/><span>{djAdded?tr('Yes, edit music preferences','نعم، تعديل التفضيلات الموسيقية'):tr(`Yes, add ${svc.name}`,`نعم، أضف ${svc.name}`)}</span></button>
        <button type="button" data-event-choice disabled={locked} aria-pressed={skipped&&!yesOn} onClick={skip}><ArrowDown size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr('Skip, show other services','تخطَّ، اعرض الخدمات الأخرى')}</span></button>
      </div>
    </aside>
    <McRow ar={ar}/>
  </BookingStep>
  </>;
}
