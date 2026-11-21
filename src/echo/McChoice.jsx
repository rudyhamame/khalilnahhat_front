import {FieldCode} from './BookingPhases';
import {useEventOrder} from './eventOrderContext';

// MC hosting & announcements as one data row under the DJ choice. The MC is NOT DJ Khalil: Echo arranges a third-party host, and the row says so.
export default function McRow({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,order=useEventOrder(),value=order?.order?.music?.mcRequested,locked=!order?.draftEditable;
  const set=next=>order?.setField('music.mcRequested',next);
  return <dl className="booking-journey-summary mc-row"><div data-empty={value===true?undefined:''}>
    <dt><FieldCode k="music.mcRequested"/>{tr('MC hosting & announcements','التقديم والإعلانات')}</dt>
    <dd>{tr('A third-party MC host arranged by Echo, not DJ Khalil himself. The host and price are confirmed in your quote.','مقدّم من طرف ثالث ننسّقه نحن في إيكو، وليس دي جي خليل نفسه. نؤكد المقدّم والسعر في عرض السعر.')}</dd>
    <span className="mc-row-choice" role="group" aria-label={tr('MC host','مقدّم الحفل')}>
      <button type="button" disabled={locked} aria-pressed={value===true} onClick={()=>set(true)}>{tr('Yes','نعم')}</button>
      <button type="button" disabled={locked} aria-pressed={value===false} onClick={()=>set(false)}>{tr('No','لا')}</button>
    </span>
  </div></dl>;
}
