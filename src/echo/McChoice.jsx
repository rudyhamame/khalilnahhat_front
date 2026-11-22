import {Check,X} from 'lucide-react';
import {useTreeService} from '../lib/tree';
import {FieldCode} from './BookingPhases';
import {useEventOrder} from './eventOrderContext';

// MC hosting and announcements are separate from DJ Khalil's service.
export default function McRow({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,svc=useTreeService('mc',ar),order=useEventOrder(),value=order?.order?.music?.mcRequested,locked=!order?.draftEditable;
  const set=next=>order?.setField('music.mcRequested',next);
  if(!svc.exists)return null; // the MC question exists only while an `mc` service is in the catalogue
  return <aside className="event-type-column mc-choice">
    <span className="avail-kicker"><FieldCode k="music.mcRequested"/>{svc.name.toUpperCase()} *</span>
    {svc.description&&<p className="mc-choice-copy">{svc.description}</p>}
    <div role="group" aria-label={svc.name}>
      <button type="button" data-event-choice disabled={locked} aria-pressed={value===true} onClick={()=>set(true)}><Check size={17} aria-hidden="true"/><span>{tr(`Yes, add ${svc.name}`,`نعم، أضف ${svc.name}`)}</span></button>
      <button type="button" data-event-choice disabled={locked} aria-pressed={value===false} onClick={()=>set(false)}><X size={17} aria-hidden="true"/><span>{tr('No, not this time','لا، ليس هذه المرة')}</span></button>
    </div>
  </aside>;
}
