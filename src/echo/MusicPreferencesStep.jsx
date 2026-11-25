import DjBookingForm from './DjBookingForm';
import {FieldCode} from './BookingPhases';
import {useEventOrder} from './eventOrderContext';
import {Music2} from 'lucide-react';

// Sub-step 03.02 of "DJ Khalil Service": the music preferences. It exists only while the DJ service is chosen, and hangs under the DJ step on a vertical connector.
export default function MusicPreferencesStep({ar=false}){
 const order=useEventOrder(),dj=Boolean(order?.order?.services?.includes('dj')),tr=(en,arabic)=>ar?arabic:en;
 // Only the client pressing "Yes" brings the sub-step into view. A saved booking that already has the DJ service (it arrives after the page loads) must not scroll the page.
 if(!dj||!order)return null;
 return <div className="dj-substep booking-services" id="dj-substep" dir={ar?'rtl':'ltr'}>
  <header className="dj-substep-head">
   <span className="dj-substep-node" aria-hidden="true"><Music2 size={18}/></span>
   <div>
    <p className="dj-substep-kicker">{tr('SUB-STEP OF ECHO SERVICES','خطوة فرعية ضمن خدمات إيكو')}</p>
    <h3>{tr('Music Preferences','التفضيلات الموسيقية')}</h3>
    <p>{tr('Tell DJ Khalil what to play: languages and dialects, genres, songs for the key moments, and your favourites.','أخبر دي جي خليل بما يعزفه: اللغات واللهجات، الأنواع، أغانٍ للحظات المهمة، ومفضلاتك.')}</p>
   </div>
  </header>
  <section id="dj-service-preferences" className="dj-prefs-section" aria-label={tr('DJ music preferences','تفضيلات موسيقى الدي جي')}>
   <div className="dj-prefs-card rentals-hero-form rentals-preferences"><DjBookingForm ar={ar} ctx={order} djAdded onClose={()=>{}} backLabel=""/></div>
  </section>
 </div>;
}
