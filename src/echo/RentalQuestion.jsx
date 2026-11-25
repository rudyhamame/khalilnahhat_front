import {ArrowDown,Boxes} from 'lucide-react';
import {useTree,useTreeService} from '../lib/tree';
import BookingStep from './BookingStep';
import {useEventOrder} from './eventOrderContext';
import {rentalServices} from '../lib/numberedRentalCatalog';

// First section of the Rental step: asks whether the client needs equipment to rent (rental.requested), like the DJ question.
// Yes opens the rental explorer below; No hides it. A client who already chose equipment cannot answer No until it is removed.
export const rentalAnswer=order=>{
  const has=order?.equipment?.length>0||order?.services?.some(id=>!['dj','mc'].includes(id));
  return has?true:order?.rental?.requested??null;
};
export default function RentalQuestion({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,ctx=useEventOrder(),{catalog}=useTree(),dj=useTreeService('dj',ar),names=rentalServices(catalog).map(row=>(ar&&row.nameAr)||row.name).join(ar?'، ':', '),order=ctx?.order,answer=rentalAnswer(order),hasItems=answer===true&&(order?.equipment?.length>0||order?.services?.some(id=>!['dj','mc'].includes(id))),locked=!ctx?.draftEditable;
  return <div className="booking-services rental-question-wrap" dir={ar?'rtl':'ltr'}>
    <BookingStep number={7} side="left" className="dj-service-step rental-question-step" title={tr('Do you need equipment to rent?','هل تحتاج إلى معدات للتأجير؟')} cardTitle={<>{tr('Rental equipment','معدات التأجير')}</>}
      copy={tr(`${dj.name?`Besides ${dj.name}, we`:'We'} rent equipment: ${names}. Tell us if your event needs any equipment; if it does, the equipment list opens below.`,`${dj.name?`إلى جانب ${dj.name}، نؤجر`:'نؤجر'} معدات: ${names}. أخبرنا إن كانت فعاليتك تحتاج إلى معدات، وإن كانت كذلك تُفتح قائمة المعدات أدناه.`)}>
      <aside className="event-type-column dj-choice">
        <span className="avail-kicker">{tr('RENTAL EQUIPMENT *','معدات التأجير *')}</span>
        <div role="group" aria-label={tr('Do you need equipment to rent?','هل تحتاج إلى معدات للتأجير؟')}>
          <button type="button" data-event-choice disabled={locked} aria-pressed={answer===true} onClick={()=>ctx.setField('rental.requested',true)}><Boxes size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr('Yes, show the equipment','نعم، اعرض المعدات')}</span></button>
          <button type="button" data-event-choice disabled={locked||hasItems} aria-pressed={answer===false} title={hasItems?tr('Remove your selected equipment first','أزل المعدات المحددة أولاً'):undefined} onClick={()=>ctx.setField('rental.requested',false)}><ArrowDown size={17} strokeWidth={1.6} aria-hidden="true"/><span>{tr('No, I do not need equipment','لا، لا أحتاج إلى معدات')}</span></button>
        </div>
      </aside>
    </BookingStep>
  </div>;
}
