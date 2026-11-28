import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {X} from 'lucide-react';
import QuotePage from './QuotePage';
import './bookingDetailsDialog.css';

export default function BookingDetailsDialog({initialEvent={},onClose,lang,inline=false,...quoteProps}){
  const dialog=useRef(null),ar=lang.lang==='ar';
  const [stage,setStage]=useState(quoteProps.autoSubmit?'sending':'review');
  const tr=(en,arabic)=>ar?arabic:en;
  const title=stage==='received'?tr('Booking request received','تم استلام طلب الحجز'):stage==='sending'?tr('Sending your booking','جارٍ إرسال حجزك'):stage==='error'?tr('Let’s try again','لنحاول مجدداً'):tr('Submit booking','إرسال الحجز');
  useEffect(()=>{
    if(inline){dialog.current?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth',block:'start'});return;}
    const element=dialog.current;
    const opener=document.activeElement;
    element.showModal();
    const previous=document.body.style.overflow;
    document.body.style.overflow='hidden';
    return()=>{element.close();document.body.style.overflow=previous;requestAnimationFrame(()=>{if(opener?.isConnected)opener.focus({preventScroll:true});});};
  },[inline]);
  if(inline)return <section ref={dialog} className="event-order-editor echo" id="event-order-form" aria-labelledby="booking-details-title" dir={ar?'rtl':'ltr'}><header className="booking-details-heading"><div><span>ECHO / EVENT ORDER</span><h2 id="booking-details-title">{ar?'أكمل ملف فعاليتك':'Complete your event brief.'}</h2><p>{ar?'تتحدث المسودة الجانبية أثناء الإجابة.':'Your live order updates alongside you as you answer.'}</p></div><button type="button" onClick={onClose} aria-label={ar?'إغلاق النموذج':'Close event form'}><X size={22}/></button></header><QuotePage {...quoteProps} lang={lang}/></section>;
  return createPortal(<dialog ref={dialog} className={`echo booking-details-dialog${quoteProps.autoSubmit?' is-submission':''}`} data-stage={stage} data-theme="dark" dir={ar?'rtl':'ltr'} aria-labelledby="booking-details-title" onCancel={event=>{event.preventDefault();onClose();}} onClick={event=>{if(event.target!==event.currentTarget)return;const rect=event.currentTarget.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)onClose();}}>
    <header className="booking-details-heading"><div><span>ECHO / {tr('YOUR EVENT','فعاليتك')}</span><h2 id="booking-details-title">{title}</h2><p>{stage==='received'?tr('Keep your Booking ID for future reference.','احتفظ برقم حجزك للرجوع إليه.'):initialEvent.eventDate?<>{initialEvent.eventDate} · {initialEvent.startTime}{initialEvent.endTime?` — ${initialEvent.endTime}`:''}{initialEvent.endTime&&initialEvent.endTime<initialEvent.startTime?(ar?' (اليوم التالي)':' (next day)'):''} · {ar?'بتوقيت تورونتو':'Toronto time'}</>:tr('One event. Every detail in place.','فعالية واحدة، وتفاصيلها في مكان واحد.')}</p></div><button type="button" autoFocus aria-label={ar?'إغلاق تفاصيل الفعالية':'Close event details'} onClick={onClose}><X size={20}/></button></header>
    <div className="booking-details-content"><QuotePage {...quoteProps} lang={lang} initialEvent={initialEvent} embedded onSubmissionStateChange={setStage} onOpenSmartCart={quoteProps.autoSubmit?onClose:undefined}/></div>
  </dialog>,document.body);
}
