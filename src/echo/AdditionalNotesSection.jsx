import {useEffect,useLayoutEffect,useRef} from 'react';
import {useEventOrder} from './eventOrderContext';
import BookingStep from './BookingStep';
import {FieldCode} from './BookingPhases';
import './referencesSection.css';

// Services-page "Additional notes" section of the Booking summary: the one free-text atom (additional.notes).
export default function AdditionalNotesSection({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,ctx=useEventOrder(),value=ctx?.order?.additional?.notes||'';
  const area=useRef(null);
  useLayoutEffect(()=>{const el=area.current;if(el){el.style.height='auto';el.style.height=`${el.scrollHeight+2}px`;}},[value]);// grows with its text, never scrolls
  useEffect(()=>{if(window.location.hash==='#additional-notes')document.getElementById('additional-notes')?.scrollIntoView({block:'start'});},[]);
  return <div id="additional-notes" className="booking-services" dir={ar?'rtl':'ltr'}>
    <BookingStep number={9} title={tr('Anything else we should know?','هل هناك ما نحتاج معرفته؟')} cardTitle={<>{tr('Additional notes','ملاحظات إضافية')}<FieldCode k="additional.notes"/></>} copy={tr('Surprises, must-haves, things to avoid. This appears under Additional notes in your Booking summary.','مفاجآت، أمور أساسية، أو أشياء تتجنبها. يظهر هذا ضمن الملاحظات الإضافية في ملخص حجزك.')}>
      <label className="ref-block"><textarea ref={area} data-booking-field="additional.notes" rows={5} maxLength={3000} dir="auto" disabled={!ctx?.draftEditable} value={value} placeholder={tr('Write anything on your mind…','اكتب أي شيء يخطر ببالك…')} onChange={event=>ctx?.setField('additional.notes',event.target.value||null)}/>
        <small className="ref-note">{value.length}/3000</small></label>
    </BookingStep>
  </div>;
}
