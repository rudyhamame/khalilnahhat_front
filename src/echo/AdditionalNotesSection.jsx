import {useEffect} from 'react';
import {useEventOrder} from './eventOrderContext';
import './referencesSection.css';

// Services-page "Additional notes" section of the Booking summary: the one free-text atom (additional.notes).
export default function AdditionalNotesSection({ar=false}){
  const tr=(en,arabic)=>ar?arabic:en,ctx=useEventOrder(),value=ctx?.order?.additional?.notes||'';
  useEffect(()=>{if(window.location.hash==='#additional-notes')document.getElementById('additional-notes')?.scrollIntoView({block:'start'});},[]);
  return <section id="additional-notes" className="rsf ref rw-vp" aria-labelledby="notes-title" dir={ar?'rtl':'ltr'}>
    <div className="rsf-copy">
      <h2 id="notes-title">{tr('Anything else we should know?','هل هناك ما نحتاج معرفته؟')}</h2>
      <p>{tr('Surprises, must-haves, things to avoid. This appears under Additional notes in your Booking summary.','مفاجآت، أمور أساسية، أو أشياء تتجنبها. يظهر هذا ضمن «ملاحظات إضافية» في ملخص حجزك.')}</p></div>
    <div className="rsf-card ref-card">
      <label className="ref-block"><h4>{tr('Additional notes','ملاحظات إضافية')}</h4>
        <textarea data-booking-field="additional.notes" rows={5} maxLength={3000} dir="auto" disabled={!ctx?.draftEditable} value={value} placeholder={tr('Write anything on your mind…','اكتب أي شيء يخطر ببالك…')} onChange={event=>ctx?.setField('additional.notes',event.target.value||null)}/>
        <small className="ref-note">{value.length}/3000</small></label>
    </div>
  </section>;
}
