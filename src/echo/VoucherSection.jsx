import {useEffect,useRef} from 'react';
import {useEventOrder} from './eventOrderContext';
import BookingStep from './BookingStep';
import {FieldCode} from './BookingPhases';
import './voucherSection.css';

export default function VoucherSection({ar=false}){
 const tr=(en,arabic)=>ar?arabic:en,ctx=useEventOrder(),input=useRef(null);
 const value=ctx?.order?.additional?.voucherCode||'';
 useEffect(()=>{if(window.location.hash==='#voucher'){document.getElementById('voucher')?.scrollIntoView({block:'start'});input.current?.focus({preventScroll:true});}},[]);
 return <div id="voucher" className="booking-services" dir={ar?'rtl':'ltr'}>
  <BookingStep number={10} title={tr('Have a voucher?','هل لديك قسيمة؟')} cardTitle={<>{tr('Voucher','القسيمة')}<FieldCode k="additional.voucherCode"/></>} copy={tr('Enter your voucher code here. We’ll check it when you review your booking.','أدخل رمز القسيمة هنا. سنتحقق منه عند مراجعة حجزك.')}>
   <label className="booking-voucher-label" htmlFor="booking-voucher-code">{tr('Voucher code','رمز القسيمة')}<small>{tr('Optional','اختياري')}</small></label>
   <input ref={input} id="booking-voucher-code" className="booking-voucher-input" data-booking-field="additional.voucherCode" aria-describedby="booking-voucher-help" type="text" dir="ltr" autoComplete="off" autoCapitalize="characters" spellCheck={false} maxLength={24} disabled={!ctx?.draftEditable} value={value} placeholder={tr('Enter your code','أدخل الرمز')} onChange={event=>ctx?.setField('additional.voucherCode',event.target.value.toUpperCase()||null)}/>
   <p id="booking-voucher-help" className="booking-voucher-help">{tr('Your code is saved with your booking draft.','يُحفظ الرمز مع مسودة حجزك.')}</p>
  </BookingStep>
 </div>;
}
