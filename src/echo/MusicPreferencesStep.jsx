import DjBookingForm from './DjBookingForm';
import {useEventOrder} from './eventOrderContext';
import {Music2} from 'lucide-react';
import {useTreeService} from '../lib/tree';

// Sub-step 03.01 of "DJ Khalil Service": the music preferences. It exists only while the DJ service is chosen, and hangs under the DJ step on a vertical connector.
export default function MusicPreferencesStep({ar=false}){
 const order=useEventOrder(),svc=useTreeService('dj',ar),dj=order?.order?.music?.djRequested===true,tr=(en,arabic)=>ar?arabic:en;
 // Only the client pressing "Yes" brings the sub-step into view. A saved booking that already has the DJ service (it arrives after the page loads) must not scroll the page.
 if(!dj||!order)return null;
 return <div className="dj-substep booking-services" id="dj-substep" dir={ar?'rtl':'ltr'}>
  <header className="dj-substep-head">
   <span className="dj-substep-node" aria-hidden="true"><Music2 size={18}/></span>
   <div>
    <p className="dj-substep-kicker">{ar?`خطوة فرعية ضمن خدمة ${svc.name}`:`SUB-STEP OF ${svc.name} SERVICE`.toUpperCase()}</p>
    <h3>{tr('Music Preferences','التفضيلات الموسيقية')}</h3>
    <p>{tr(`Tell ${svc.name} what to play: languages and dialects, genres, songs for the key moments, and your favourites.`,`أخبر ${svc.name} بما يعزفه: اللغات واللهجات، الأنواع، أغانٍ للحظات المهمة، ومفضلاتك.`)}</p>
   </div>
  </header>
  <section id="dj-service-preferences" className="dj-prefs-section" aria-label={tr('DJ music preferences','تفضيلات موسيقى الدي جي')}>
   <div className="dj-prefs-card rentals-hero-form rentals-preferences"><DjBookingForm ar={ar} ctx={order} djAdded onClose={()=>{}} backLabel=""/></div>
  </section>
 </div>;
}
