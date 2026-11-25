import {bookingAtomInputProps} from '../lib/bookingAtoms.mjs';
import {useTree,useTreeService} from '../lib/tree';
import BookingStep from './BookingStep';
import {FieldCode} from './BookingPhases';
import {ArrowDown,Disc3} from 'lucide-react';
import {djServiceChanges} from '../lib/bookingFlow.mjs';
import {rentalServices} from '../lib/numberedRentalCatalog';
import {useEventOrder} from './eventOrderContext';
import './rentalsHero.css';

// Step 03, DJ Khalil Service: the same step layout as the event steps. The hero asks whether the client wants this service (or skips to the other services); "yes" opens the music preferences in the card.
export default function RentalsHero({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,svc=useTreeService('dj',ar),mcSvc=useTreeService('mc',ar),{catalog}=useTree(),rentalNames=rentalServices(catalog).filter(row=>row.id!=='mc'&&!row.selectionField).map(row=>(ar&&row.nameAr)||row.name).join(ar?'، ':', '),order=useEventOrder(),decision=order?.order?.music?.djRequested,djAdded=decision===true,locked=!order?.draftEditable;
  // Yes: add the DJ service to the booking and open the music preferences.
  const yes=()=>{if(order&&!locked)djServiceChanges(order.order,'dj').forEach(({path,value})=>order.setField(path,value));};
  const skip=()=>{if(!order||locked)return;if(djAdded)order.removeService('dj');else order.setField('music.djRequested',false);};
  if(!svc.exists)return null;
  return <>
    <img className="dj-service-hero" src="/echo/dj-service-hero.webp" width="1536" height="1024" alt={tr('A DJ at the decks, headphones on, mixing a live set','دي جي خلف الأجهزة يضع السماعات ويمزج مجموعة حيّة')} loading="lazy"/>
  <BookingStep number={6} side="right" className="dj-service-step" title={tr('Would you like to add Echo services to your event?','هل تريد إضافة خدمات إيكو إلى فعاليتك؟')} cardTitle={<>{tr('Add Echo services','إضافة خدمات إيكو')}</>} copy={tr(`The heart of Echo. Music shaped around your event: a DJ who reads the room${mcSvc.name?`, ${mcSvc.name} when you need a voice,`:''}${rentalNames?` and ${rentalNames} to match`:''}. Tell us if you want this service, or skip it and go straight to the other services.`,`قلب إيكو. موسيقى مصمّمة على قياس مناسبتك: دي جي يقرأ أجواء القاعة${mcSvc.name?`، و${mcSvc.name} عند الحاجة،`:''}${rentalNames?` مع ${rentalNames} بما يناسبها`:''}. أخبرنا إن كنت تريد هذه الخدمة، أو تجاوزها إلى بقية الخدمات.`)}>
    <aside className="event-type-column dj-choice">
      <span className="avail-kicker"><FieldCode k="music.djRequested"/>{tr('ADD ECHO SERVICES','إضافة خدمات إيكو')}</span>
      <div {...bookingAtomInputProps('music.djRequested',order?.order)} role="group" aria-label={svc.name}>
        <button type="button" data-event-choice disabled={locked} aria-pressed={decision===true} onClick={yes}><Disc3 size={17} strokeWidth={1.6} aria-hidden="true"/><span>{djAdded?tr('Yes, edit music preferences','نعم، تعديل التفضيلات الموسيقية'):tr('Yes, add Echo services','نعم، أضف خدمات إيكو')}</span></button>
        <button type="button" data-event-choice disabled={locked} aria-pressed={decision===false} onClick={skip}><ArrowDown size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr('Skip, show rental equipment','تخطَّ، اعرض معدات التأجير')}</span></button>
      </div>
    </aside>
  </BookingStep>
  </>;
}
