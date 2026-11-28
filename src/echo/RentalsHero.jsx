import {bookingAtomInputProps,requiredMark} from '../lib/bookingAtoms.mjs';
import {useTreeService} from '../lib/tree';
import BookingStep from './BookingStep';
import {FieldCode} from './BookingPhases';
import {ArrowDown,Disc3} from 'lucide-react';
import {djServiceChanges} from '../lib/bookingFlow.mjs';
import {useEventOrder} from './eventOrderContext';
import './rentalsHero.css';

// Step 03, DJ Khalil Service: the same step layout as the event steps. The hero asks whether the client wants this service (or skips to the other services); "yes" opens the music preferences in the card.
export default function RentalsHero({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,svc=useTreeService('dj',ar),order=useEventOrder(),decision=order?.order?.music?.djRequested,djAdded=decision===true,locked=!order?.draftEditable;
  // Yes: add the DJ service to the booking and open the music preferences.
  const yes=()=>{if(order&&!locked)djServiceChanges(order.order,'dj').forEach(({path,value})=>order.setField(path,value));};
  const skip=()=>{if(!order||locked)return;if(djAdded)order.removeService('dj');else order.setField('music.djRequested',false);};
  if(!svc.exists)return null;
  return <>
    <img className="dj-service-hero" src="/echo/dj-service-hero.webp" width="1536" height="1024" alt={tr('A DJ at the decks, headphones on, mixing a live set','دي جي خلف الأجهزة يضع السماعات ويمزج مجموعة حيّة')} loading="lazy"/>
  <BookingStep number={6} side="right" className="dj-service-step" title={tr(`Would you like to add ${svc.name} to your event?`,`هل تريد إضافة ${svc.name} إلى فعاليتك؟`)} cardTitle={<>{tr(`Add ${svc.name}`,`إضافة ${svc.name}`)}</>} copy={tr(`A music set built around your event and played live by ${svc.name}: he reads the room, follows your crowd's energy and moves from dinner background to the dance floor at the right moment. Tell us if you want this service. If you say yes, you can share your languages, genres, favourite songs and the key moments. If not, skip it and go straight to the other services.`,`مجموعة موسيقية مصمّمة على قياس مناسبتك ويعزفها ${svc.name} مباشرة: يقرأ أجواء القاعة ويتابع حماس الحضور وينتقل من موسيقى العشاء إلى حلبة الرقص في اللحظة المناسبة. أخبرنا إن كنت تريد هذه الخدمة. إن وافقت يمكنك مشاركة لغاتك وأنواعك وأغانيك المفضلة واللحظات المهمة. وإلا تجاوزها إلى بقية الخدمات.`)}>
    <aside className="event-type-column dj-choice">
      <span className="avail-kicker"><FieldCode k="music.djRequested"/>{(ar?`إضافة ${svc.name}`:`ADD ${svc.name}`.toUpperCase())+requiredMark('music.djRequested')}</span>
      <div {...bookingAtomInputProps('music.djRequested',order?.order)} role="group" aria-label={svc.name}>
        <button type="button" data-event-choice disabled={locked} aria-pressed={decision===true} onClick={yes}><Disc3 size={17} strokeWidth={1.6} aria-hidden="true"/><span>{djAdded?tr('Yes, edit music preferences','نعم، تعديل التفضيلات الموسيقية'):tr(`Yes, add ${svc.name}`,`نعم، أضف ${svc.name}`)}</span></button>
        <button type="button" data-event-choice disabled={locked} aria-pressed={decision===false} onClick={skip}><ArrowDown size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr('Skip, show rental equipment','تخطَّ، اعرض معدات التأجير')}</span></button>
      </div>
    </aside>
  </BookingStep>
  </>;
}
